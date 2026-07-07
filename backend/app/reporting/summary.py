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

    return {
        "total": total,
        "online": online,
        "warning": warning,
        "offline": offline,
        "protected": protected,
        "unprotected": unprotected,
        "unprotected_online": unprotected_online,
        "unprotected_offline": unprotected_offline,
        "pct_online": round((online + warning) / total * 100, 1) if total else 0.0,
        "pct_protected": round(protected / total * 100, 1) if total else 0.0,
    }
