"""Orquestra a checagem completa de um domínio (HTTP + DNS + Akamai + TLS) e
o scan de um lote de domínios em paralelo, com streaming dos resultados
conforme completam."""

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime

import httpx

from app.models import Domain
from app.scanner.detector import combine_akamai_detection
from app.scanner.dns_check import resolve_a_record, resolve_cname_chain
from app.scanner.http_check import check_domain_http
from app.scanner.tls_check import get_tls_cert_info


@dataclass
class DomainScanResult:
    domain_id: int
    hostname: str
    checked_url: str
    status: str
    http_status_code: int | None
    error_message: str | None
    response_time_ms: float | None
    resolved_ip: str | None
    akamai_protected: bool
    akamai_signals: list[str]
    cname_chain: list[str]
    tls_issuer: str | None
    tls_expiry: datetime | None


async def scan_domain(
    client: httpx.AsyncClient,
    domain: Domain,
    semaphore: asyncio.Semaphore,
    include_tls: bool = True,
) -> DomainScanResult:
    async with semaphore:
        http_result = await check_domain_http(client, domain.hostname)
        cname_chain = await asyncio.to_thread(resolve_cname_chain, domain.hostname)
        resolved_ip = await asyncio.to_thread(resolve_a_record, domain.hostname)

        protected, signals = combine_akamai_detection(
            http_result.headers, http_result.cookie_names, cname_chain
        )

        tls_issuer, tls_expiry = (None, None)
        if include_tls and http_result.status != "OFFLINE":
            tls_issuer, tls_expiry = await asyncio.to_thread(get_tls_cert_info, domain.hostname)

        return DomainScanResult(
            domain_id=domain.id,
            hostname=domain.hostname,
            checked_url=http_result.url,
            status=http_result.status,
            http_status_code=http_result.http_status_code,
            error_message=http_result.error_message,
            response_time_ms=http_result.response_time_ms,
            resolved_ip=resolved_ip,
            akamai_protected=protected,
            akamai_signals=signals,
            cname_chain=cname_chain,
            tls_issuer=tls_issuer,
            tls_expiry=tls_expiry,
        )


async def run_scan(
    domains: list[Domain], concurrency: int = 30, include_tls: bool = True
) -> AsyncIterator[DomainScanResult]:
    semaphore = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency * 2, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(follow_redirects=True, limits=limits) as client:
        tasks = [asyncio.create_task(scan_domain(client, d, semaphore, include_tls)) for d in domains]
        for coro in asyncio.as_completed(tasks):
            yield await coro
