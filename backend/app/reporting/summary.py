"""Métricas agregadas de um scan run, compartilhadas entre a API, o XLSX e o PDF."""

from app.models import ScanResult


def compute_scan_summary(results: list[ScanResult]) -> dict:
    total = len(results)
    online = sum(1 for r in results if r.status == "ONLINE")
    warning = sum(1 for r in results if r.status == "WARNING")
    offline = sum(1 for r in results if r.status == "OFFLINE")
    protected = sum(1 for r in results if r.akamai_protected)
    unprotected = total - protected
    unprotected_online = sum(
        1 for r in results if r.status in ("ONLINE", "WARNING") and not r.akamai_protected
    )
    unprotected_offline = unprotected - unprotected_online

    internal_count = sum(1 for r in results if r.is_internal is True)
    external_count = sum(1 for r in results if r.is_internal is False)
    unknown_exposure_count = total - internal_count - external_count

    # Risco real: exposto na internet, online e sem WAF - domínios internos sem
    # proteção não são prioridade, já que não são alcançáveis de fora.
    external_unprotected_online = sum(
        1
        for r in results
        if r.status in ("ONLINE", "WARNING") and not r.akamai_protected and r.is_internal is False
    )
    internal_unprotected_online = sum(
        1
        for r in results
        if r.status in ("ONLINE", "WARNING") and not r.akamai_protected and r.is_internal is True
    )

    s3_checked_count = sum(1 for r in results if r.s3_status is not None)
    s3_public_count = sum(1 for r in results if r.s3_status == "public")

    return {
        "total": total,
        "online": online,
        "warning": warning,
        "offline": offline,
        "protected": protected,
        "unprotected": unprotected,
        "unprotected_online": unprotected_online,
        "unprotected_offline": unprotected_offline,
        "internal_count": internal_count,
        "external_count": external_count,
        "unknown_exposure_count": unknown_exposure_count,
        "external_unprotected_online": external_unprotected_online,
        "internal_unprotected_online": internal_unprotected_online,
        "s3_checked_count": s3_checked_count,
        "s3_public_count": s3_public_count,
        "pct_online": round((online + warning) / total * 100, 1) if total else 0.0,
        "pct_protected": round(protected / total * 100, 1) if total else 0.0,
    }
