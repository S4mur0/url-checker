"""Checagem HTTP/HTTPS de um domínio (porta de fetch_single_url/fetch_status
do protótipo original, agora em cima de httpx.AsyncClient)."""

import ssl
import time
from dataclasses import dataclass, field

import httpx


@dataclass
class HttpCheckResult:
    url: str
    status: str  # ONLINE | WARNING | OFFLINE
    http_status_code: int | None
    error_message: str | None
    response_time_ms: float | None
    headers: httpx.Headers | None
    cookie_names: list[str] = field(default_factory=list)


async def fetch_single(client: httpx.AsyncClient, url: str, timeout: float = 5.0) -> HttpCheckResult:
    start = time.perf_counter()
    try:
        response = await client.get(url, timeout=timeout, follow_redirects=True)
        elapsed_ms = (time.perf_counter() - start) * 1000
        status = "ONLINE" if response.status_code == 200 else "WARNING"
        return HttpCheckResult(
            url=url,
            status=status,
            http_status_code=response.status_code,
            error_message=None,
            response_time_ms=elapsed_ms,
            headers=response.headers,
            cookie_names=list(response.cookies.keys()),
        )
    except httpx.TimeoutException:
        msg = "Sem resposta (Timeout)"
    except httpx.ConnectError as e:
        msg = "Erro de Certificado SSL" if isinstance(e.__cause__, ssl.SSLError) else "Falha de Conexão"
    except httpx.RequestError as e:
        msg = type(e).__name__

    return HttpCheckResult(
        url=url,
        status="OFFLINE",
        http_status_code=None,
        error_message=msg,
        response_time_ms=None,
        headers=None,
        cookie_names=[],
    )


async def check_domain_http(client: httpx.AsyncClient, hostname: str) -> HttpCheckResult:
    """Tenta HTTPS primeiro; se ficar OFFLINE (timeout/conexão/SSL), tenta HTTP."""
    https_result = await fetch_single(client, f"https://{hostname}")
    if https_result.status == "OFFLINE":
        http_result = await fetch_single(client, f"http://{hostname}")
        if http_result.status != "OFFLINE":
            return http_result
    return https_result
