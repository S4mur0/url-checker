"""Detecção de buckets S3 (AWS) associados a um domínio.

Três níveis de confiança, do mais pro menos certo:
1. cname_direct  - CNAME aponta direto pro S3 (bucket.s3.amazonaws.com,
   bucket.s3-website-<região>.amazonaws.com etc). O nome do bucket é
   literalmente o hostname - garantido pela própria AWS (hosting de site
   estático via CNAME exige bucket com esse nome exato).
2. cname_cdn     - CNAME aponta pra CloudFront, ou o domínio já está atrás de
   Akamai. A origem real fica escondida atrás do CDN/WAF - não dá pra
   confirmar via DNS, mas é comum o bucket de origem ter o mesmo nome do
   domínio. Verificamos mesmo assim, como palpite não confirmado.
3. guess         - nenhum sinal de CDN/S3 na cadeia de CNAME. Ainda assim
   tentamos o mesmo nome do domínio (uma request extra, sem wordlist/
   brute-force) - às vezes sobra um bucket órfão de uma migração antiga.

A checagem em si sempre usa path-style (s3.amazonaws.com/<bucket>), não
virtual-hosted-style (<bucket>.s3.amazonaws.com) - nomes de bucket derivados
de domínio têm ponto, e o certificado wildcard *.s3.amazonaws.com só cobre
um nível de subdomínio, quebrando TLS para bucket.dominio.com.s3.amazonaws.com.
"""

import re

import httpx

S3_DIRECT_CNAME_RE = re.compile(r"\.s3[.-][\w-]*\.amazonaws\.com$", re.IGNORECASE)
CDN_CNAME_SUFFIXES = ["cloudfront.net"]


def classify_s3_source(cname_chain: list[str], akamai_protected: bool) -> str:
    for hop in cname_chain:
        if S3_DIRECT_CNAME_RE.search(hop.lower()):
            return "cname_direct"
    for hop in cname_chain:
        if any(hop.lower().endswith(suffix) for suffix in CDN_CNAME_SUFFIXES):
            return "cname_cdn"
    if akamai_protected:
        return "cname_cdn"  # WAF/CDN também esconde a origem, mesmo raciocínio
    return "guess"


def _classify_body(status_code: int, body: str, url: str) -> dict | None:
    if status_code == 200 and "<ListBucketResult" in body:
        return {"status": "public", "signal": f"http:200 ListBucketResult em {url}"}
    if "<Code>AccessDenied</Code>" in body or status_code == 403:
        return {"status": "private", "signal": f"http:{status_code} AccessDenied em {url}"}
    if "<Code>NoSuchBucket</Code>" in body or status_code == 404:
        return {"status": "not_found", "signal": None}
    return None


async def check_s3_bucket(client: httpx.AsyncClient, bucket_name: str, timeout: float = 5.0) -> dict:
    """Bate na URL path-style do bucket e classifica pela resposta.

    Buckets fora da região padrão (us-east-1) respondem 301 no endpoint
    genérico sem header Location (só um x-amz-bucket-region) - o
    follow_redirects do httpx não ajuda nesse caso, então refazemos a
    request manualmente contra o endpoint regional correto."""
    url = f"https://s3.amazonaws.com/{bucket_name}/"
    try:
        response = await client.get(url, timeout=timeout, follow_redirects=True)
    except httpx.RequestError:
        return {"status": "not_found", "signal": None}

    body = response.text[:2000]
    classified = _classify_body(response.status_code, body, url)
    if classified:
        return classified

    region = response.headers.get("x-amz-bucket-region")
    if response.status_code == 301 and region:
        regional_url = f"https://s3.{region}.amazonaws.com/{bucket_name}/"
        try:
            response = await client.get(regional_url, timeout=timeout, follow_redirects=True)
            classified = _classify_body(response.status_code, response.text[:2000], regional_url)
            if classified:
                return classified
        except httpx.RequestError:
            pass
        return {"status": "private", "signal": f"bucket existe (região {region}), listagem não confirmada"}

    return {"status": "unknown", "signal": f"http:{response.status_code} resposta inesperada em {url}"}


async def check_s3_for_domain(
    client: httpx.AsyncClient, hostname: str, cname_chain: list[str], akamai_protected: bool
) -> dict:
    source = classify_s3_source(cname_chain, akamai_protected)
    result = await check_s3_bucket(client, hostname)
    return {
        "bucket_name": hostname,
        "status": result["status"],
        "source": source,
        "signals": [result["signal"]] if result["signal"] else [],
    }
