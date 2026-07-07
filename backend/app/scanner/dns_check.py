"""Resolução de DNS (síncrona - dnspython não tem resolver assíncrono estável).

Deve ser chamada via asyncio.to_thread() a partir de código async.
"""

import ipaddress

import dns.resolver


def is_internal_ip(ip: str) -> bool | None:
    """True se o IP for de rede privada/reservada (RFC 1918, loopback, link-local,
    CGNAT, etc - via ipaddress.is_private), False se for público/roteável na
    internet, None se a string não for um IP válido."""
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return None


def resolve_cname_chain(hostname: str, max_hops: int = 10, timeout: float = 5.0) -> list[str]:
    """Resolve a cadeia de CNAME iterativamente até esgotar, chegar a um A record
    ou atingir max_hops. Retorna a lista de alvos (vazia se o domínio já resolve
    direto para A, sem CNAME)."""
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout

    chain: list[str] = []
    current = hostname
    for _ in range(max_hops):
        try:
            answer = resolver.resolve(current, "CNAME")
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout, dns.resolver.NoNameservers):
            break
        target = str(answer[0].target).rstrip(".")
        chain.append(target)
        current = target
    return chain


def resolve_a_record(hostname: str, timeout: float = 5.0) -> str | None:
    """Primeiro IPv4 resolvido, ou None em caso de falha."""
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout
    try:
        answer = resolver.resolve(hostname, "A")
        return str(answer[0])
    except Exception:
        return None
