"""Leitura de metadados do certificado TLS (issuer/expiry). Síncrono - chamar
via asyncio.to_thread()."""

import socket
import ssl
from datetime import datetime


def get_tls_cert_info(hostname: str, port: int = 443, timeout: float = 5.0) -> tuple[str | None, datetime | None]:
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
        issuer_parts = dict(x[0] for x in cert.get("issuer", []))
        issuer = issuer_parts.get("organizationName") or issuer_parts.get("commonName")
        expiry_raw = cert.get("notAfter")
        expiry = ssl.cert_time_to_seconds(expiry_raw) if expiry_raw else None
        expiry_dt = datetime.utcfromtimestamp(expiry) if expiry else None
        return issuer, expiry_dt
    except Exception:
        return None, None
