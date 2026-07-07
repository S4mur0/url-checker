"""Detecção de proteção Akamai combinando sinais de headers HTTP, cookies e
cadeia de CNAME. Um domínio é considerado protegido se QUALQUER sinal disparar."""

import httpx

from app.scanner.akamai_signatures import (
    AKAMAI_CNAME_SUFFIXES,
    AKAMAI_COOKIE_NAMES,
    AKAMAI_COOKIE_PREFIXES,
    AKAMAI_HEADER_PREFIXES,
    AKAMAI_HEADER_SIGNATURES,
)


def detect_akamai_from_headers(headers: httpx.Headers | None) -> list[str]:
    if headers is None:
        return []
    signals = []
    for name, value in headers.items():
        name_lower = name.lower()
        if name_lower in AKAMAI_HEADER_SIGNATURES:
            if value.lower() in AKAMAI_HEADER_SIGNATURES[name_lower]:
                signals.append(f"header:{name}={value}")
        if any(name_lower.startswith(prefix) for prefix in AKAMAI_HEADER_PREFIXES):
            signals.append(f"header:{name}")
    return signals


def detect_akamai_from_cookies(cookie_names: list[str]) -> list[str]:
    signals = []
    for name in cookie_names:
        if name in AKAMAI_COOKIE_NAMES or any(name.startswith(p) for p in AKAMAI_COOKIE_PREFIXES):
            signals.append(f"cookie:{name}")
    return signals


def detect_akamai_from_cname_chain(cname_chain: list[str]) -> list[str]:
    signals = []
    for hop in cname_chain:
        hop_lower = hop.lower()
        if any(hop_lower.endswith(suffix) for suffix in AKAMAI_CNAME_SUFFIXES):
            signals.append(f"cname:{hop}")
    return signals


def combine_akamai_detection(
    headers: httpx.Headers | None,
    cookie_names: list[str],
    cname_chain: list[str],
) -> tuple[bool, list[str]]:
    signals = [
        *detect_akamai_from_headers(headers),
        *detect_akamai_from_cookies(cookie_names),
        *detect_akamai_from_cname_chain(cname_chain),
    ]
    return (len(signals) > 0, signals)
