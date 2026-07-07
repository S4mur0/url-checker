import math
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import CSS, HTML

from app.models import ScanResult, ScanRun
from app.reporting.summary import compute_scan_summary

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _exposure_label(is_internal: bool | None) -> str:
    if is_internal is True:
        return "Interno"
    if is_internal is False:
        return "Externo"
    return "Desconhecido"


def _exposure_class(is_internal: bool | None) -> str:
    if is_internal is True:
        return "internal"
    if is_internal is False:
        return "external"
    return "unknown"


_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)
_env.filters["exposure_label"] = _exposure_label
_env.filters["exposure_class"] = _exposure_class


def _donut_segments(summary: dict) -> list[dict]:
    """Segmentos de um donut chart SVG feito à mão (stroke-dasharray/dashoffset) -
    evita depender de uma lib de gráficos só para poucas fatias."""
    segments = [
        ("Protegido (Akamai)", summary["protected"], "#10b981"),
        ("Externo e sem proteção (risco)", summary["external_unprotected_online"], "#ef4444"),
        ("Interno e sem proteção", summary["internal_unprotected_online"], "#f59e0b"),
        ("Offline e sem proteção", summary["unprotected_offline"], "#94a3b8"),
    ]
    total = summary["total"] or 1
    radius = 60
    circumference = 2 * math.pi * radius
    cumulative = 0.0
    out = []
    for label, count, color in segments:
        fraction = count / total
        length = fraction * circumference
        out.append(
            {
                "label": label,
                "count": count,
                "color": color,
                "dasharray": f"{length:.2f} {circumference - length:.2f}",
                "dashoffset": -cumulative,
            }
        )
        cumulative += length
    return out


def build_pdf_report(scan_run: ScanRun, results: list[ScanResult], project_name: str = "") -> bytes:
    summary = compute_scan_summary(results)
    exposure_order = {False: 0, True: 1, None: 2}  # externo (risco real) primeiro
    risky = sorted(
        (r for r in results if r.status in ("ONLINE", "WARNING") and not r.akamai_protected),
        key=lambda r: (exposure_order[r.is_internal], r.domain.hostname),
    )
    sorted_results = sorted(results, key=lambda r: r.domain.hostname)

    template = _env.get_template("executive_report.html")
    html_content = template.render(
        scan_run=scan_run,
        summary=summary,
        risky=risky,
        results=sorted_results,
        donut_segments=_donut_segments(summary),
        project_name=project_name,
        generated_at=datetime.now(timezone.utc),
    )

    return HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf(
        stylesheets=[CSS(filename=str(TEMPLATES_DIR / "report.css"))]
    )
