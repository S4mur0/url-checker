import math
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import CSS, HTML

from app.models import ScanResult, ScanRun
from app.reporting.summary import compute_scan_summary

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def _donut_segments(summary: dict) -> list[dict]:
    """Segmentos de um donut chart SVG feito à mão (stroke-dasharray/dashoffset) -
    evita depender de uma lib de gráficos só para 3 fatias."""
    segments = [
        ("Protegido (Akamai)", summary["protected"], "#10b981"),
        ("Não protegido e online", summary["unprotected_online"], "#ef4444"),
        ("Não protegido e offline", summary["unprotected_offline"], "#94a3b8"),
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


def build_pdf_report(scan_run: ScanRun, results: list[ScanResult]) -> bytes:
    summary = compute_scan_summary(results)
    risky = sorted(
        (r for r in results if r.status in ("ONLINE", "WARNING") and not r.akamai_protected),
        key=lambda r: r.domain.hostname,
    )
    sorted_results = sorted(results, key=lambda r: r.domain.hostname)

    template = _env.get_template("executive_report.html")
    html_content = template.render(
        scan_run=scan_run,
        summary=summary,
        risky=risky,
        results=sorted_results,
        donut_segments=_donut_segments(summary),
        generated_at=datetime.now(timezone.utc),
    )

    return HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf(
        stylesheets=[CSS(filename=str(TEMPLATES_DIR / "report.css"))]
    )
