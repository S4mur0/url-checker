"""Assinaturas conhecidas de infraestrutura Akamai (CDN/WAF/Bot Manager).

Apenas dados, sem lógica de detecção (ver detector.py).
"""

AKAMAI_HEADER_SIGNATURES = {
    "server": ["akamaighost"],
}

AKAMAI_HEADER_PREFIXES = ["x-akamai-"]

AKAMAI_COOKIE_NAMES = {"_abck", "bm_sz", "ak_bmsc", "aka_a2"}

AKAMAI_COOKIE_PREFIXES = ["akavpau_"]

AKAMAI_CNAME_SUFFIXES = [
    "akamai.net",
    "akamaiedge.net",
    "akamaized.net",
    "edgekey.net",
    "edgesuite.net",
    "akamaitechnologies.com",
    "akadns.net",
]
