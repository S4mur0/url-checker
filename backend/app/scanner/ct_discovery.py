"""Descoberta de subdomínios via Certificate Transparency (crt.sh).

Complementar à detecção de S3: a checagem de bucket já olha CNAME/CDN de
domínios cadastrados, mas só alcança o que já está na lista. Isso aqui
descobre subdomínios que o usuário nem sabe que existem (certificado TLS já
emitido para eles em algum momento) - o scan normal, com a checagem de S3 já
existente, cuida do resto depois que o subdomínio entra na lista.

crt.sh é um serviço público gratuito, sem autenticação, mas historicamente
lento e instável sob carga - timeout generoso e cap no número de resultados
são propositais, não um descuido.
"""

import asyncio

import httpx

CRTSH_URL = "https://crt.sh/"
MAX_CANDIDATES = 5000


def _normalize(name: str) -> str:
    name = name.strip().lower()
    if name.startswith("*."):
        name = name[2:]
    return name


async def _query_crtsh(client: httpx.AsyncClient, query: str, timeout: float) -> tuple[list[dict], bool]:
    """Retorna (entradas, sucesso). Sucesso=False não é erro fatal - o outro
    query paralelo pode ter dado certo e ainda vale a pena devolver algo."""
    try:
        response = await client.get(
            CRTSH_URL, params={"q": query, "output": "json"}, timeout=timeout
        )
        if response.status_code != 200:
            return [], False
        return response.json(), True
    except (httpx.RequestError, ValueError):
        # ValueError cobre JSON inválido - crt.sh às vezes devolve HTML de erro/rate-limit
        return [], False


async def discover_subdomains(root_domain: str, timeout: float = 60.0) -> dict:
    """Consulta crt.sh por certificados emitidos para *.root_domain e o próprio
    root_domain, extrai todos os SANs (campo name_value, um por linha), filtra
    só o que realmente pertence a root_domain e devolve a lista única e
    ordenada. Não lança exceção - falha de rede vira lista vazia + flag."""
    root_domain = root_domain.strip().lower()
    candidates: set[str] = set()

    async with httpx.AsyncClient(follow_redirects=True) as client:
        results = await asyncio.gather(
            _query_crtsh(client, f"%.{root_domain}", timeout),
            _query_crtsh(client, root_domain, timeout),
        )

    ok = any(success for _, success in results)
    for entries, _ in results:
        for entry in entries:
            raw_names = entry.get("name_value", "")
            for name in raw_names.splitlines():
                normalized = _normalize(name)
                if normalized == root_domain or normalized.endswith(f".{root_domain}"):
                    candidates.add(normalized)
            if len(candidates) >= MAX_CANDIDATES:
                break

    sorted_candidates = sorted(candidates)
    truncated = len(sorted_candidates) >= MAX_CANDIDATES
    return {
        "root_domain": root_domain,
        "candidates": sorted_candidates[:MAX_CANDIDATES],
        "truncated": truncated,
        "ok": ok,
    }
