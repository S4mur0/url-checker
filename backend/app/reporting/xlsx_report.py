import io

from openpyxl import Workbook
from openpyxl.chart import PieChart, Reference
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

from app.models import ScanResult, ScanRun
from app.reporting.summary import compute_scan_summary

GREEN = "10B981"
AMBER = "F59E0B"
RED = "EF4444"
HEADER_BG = "1E293B"

STATUS_FILL = {
    "ONLINE": PatternFill("solid", fgColor=GREEN),
    "WARNING": PatternFill("solid", fgColor=AMBER),
    "OFFLINE": PatternFill("solid", fgColor=RED),
}
PROTECTED_FILL = PatternFill("solid", fgColor=GREEN)
UNPROTECTED_FILL = PatternFill("solid", fgColor=RED)
HEADER_FILL = PatternFill("solid", fgColor=HEADER_BG)
HEADER_FONT = Font(color="FFFFFF", bold=True)


def _style_header_row(ws: Worksheet, row: int, ncols: int) -> None:
    for col in range(1, ncols + 1):
        cell = ws.cell(row=row, column=col)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center")


def _autosize_columns(ws: Worksheet, widths: list[int]) -> None:
    for idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width


def _build_summary_sheet(wb: Workbook, scan_run: ScanRun, summary: dict) -> None:
    ws = wb.active
    ws.title = "Resumo"

    ws["A1"] = "Relatório Executivo — Cobertura WAF (Akamai)"
    ws["A1"].font = Font(size=16, bold=True)
    ws["A2"] = f"Scan run #{scan_run.id}  ·  {scan_run.started_at:%d/%m/%Y %H:%M}"
    ws["A2"].font = Font(italic=True, color="64748B")

    metrics = [
        ("Total de domínios", summary["total"]),
        ("Online", summary["online"]),
        ("Warning (HTTP != 200)", summary["warning"]),
        ("Offline", summary["offline"]),
        ("% Online", f"{summary['pct_online']}%"),
        ("Protegidos por Akamai", summary["protected"]),
        ("% Cobertura WAF", f"{summary['pct_protected']}%"),
        ("Não protegidos e online (risco prioritário)", summary["unprotected_online"]),
        ("Não protegidos e offline", summary["unprotected_offline"]),
    ]

    start_row = 4
    ws.cell(row=start_row, column=1, value="Métrica")
    ws.cell(row=start_row, column=2, value="Valor")
    _style_header_row(ws, start_row, 2)

    for i, (label, value) in enumerate(metrics, start=start_row + 1):
        ws.cell(row=i, column=1, value=label)
        cell = ws.cell(row=i, column=2, value=value)
        if label.startswith("Não protegidos e online"):
            cell.fill = UNPROTECTED_FILL
            cell.font = Font(bold=True, color="FFFFFF")

    _autosize_columns(ws, [42, 14])

    chart_start = start_row + len(metrics) + 3
    ws.cell(row=chart_start, column=1, value="Categoria")
    ws.cell(row=chart_start, column=2, value="Domínios")
    ws.cell(row=chart_start + 1, column=1, value="Protegido (Akamai)")
    ws.cell(row=chart_start + 1, column=2, value=summary["protected"])
    ws.cell(row=chart_start + 2, column=1, value="Não protegido e online")
    ws.cell(row=chart_start + 2, column=2, value=summary["unprotected_online"])
    ws.cell(row=chart_start + 3, column=1, value="Não protegido e offline")
    ws.cell(row=chart_start + 3, column=2, value=summary["unprotected_offline"])

    chart = PieChart()
    chart.title = "Cobertura WAF"
    data = Reference(ws, min_col=2, min_row=chart_start, max_row=chart_start + 3)
    categories = Reference(ws, min_col=1, min_row=chart_start + 1, max_row=chart_start + 3)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(categories)
    chart.height = 8
    chart.width = 12
    ws.add_chart(chart, f"D{start_row}")


def _build_risk_sheet(wb: Workbook, results: list[ScanResult]) -> None:
    ws = wb.create_sheet("Risco - Sem Proteção")
    headers = ["Hostname", "URL Verificada", "Status", "Código HTTP", "IP Resolvido", "Verificado em"]
    ws.append(headers)
    _style_header_row(ws, 1, len(headers))

    risky = [r for r in results if r.status in ("ONLINE", "WARNING") and not r.akamai_protected]
    risky.sort(key=lambda r: r.domain.hostname)

    for r in risky:
        row = [
            r.domain.hostname,
            r.checked_url,
            r.status,
            r.http_status_code,
            r.resolved_ip,
            r.checked_at.strftime("%d/%m/%Y %H:%M"),
        ]
        ws.append(row)
        ws.cell(row=ws.max_row, column=3).fill = STATUS_FILL[r.status]

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    _autosize_columns(ws, [32, 40, 12, 12, 16, 18])


def _build_detail_sheet(wb: Workbook, results: list[ScanResult]) -> None:
    ws = wb.create_sheet("Detalhado")
    headers = [
        "Hostname", "URL Verificada", "Status", "Código HTTP", "Erro",
        "Tempo Resposta (ms)", "IP Resolvido", "Protegido Akamai", "Sinais Akamai",
        "Cadeia CNAME", "TLS Issuer", "TLS Expira em", "Verificado em",
    ]
    ws.append(headers)
    _style_header_row(ws, 1, len(headers))

    for r in sorted(results, key=lambda r: r.domain.hostname):
        row = [
            r.domain.hostname,
            r.checked_url,
            r.status,
            r.http_status_code,
            r.error_message,
            round(r.response_time_ms, 1) if r.response_time_ms else None,
            r.resolved_ip,
            "Sim" if r.akamai_protected else "Não",
            "; ".join(r.akamai_signals),
            " -> ".join(r.cname_chain),
            r.tls_issuer,
            r.tls_expiry.strftime("%d/%m/%Y") if r.tls_expiry else None,
            r.checked_at.strftime("%d/%m/%Y %H:%M"),
        ]
        ws.append(row)
        line = ws.max_row
        ws.cell(row=line, column=3).fill = STATUS_FILL[r.status]
        ws.cell(row=line, column=8).fill = PROTECTED_FILL if r.akamai_protected else UNPROTECTED_FILL

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    _autosize_columns(ws, [32, 40, 10, 12, 20, 16, 16, 14, 40, 40, 24, 14, 18])


def build_xlsx_report(scan_run: ScanRun, results: list[ScanResult]) -> io.BytesIO:
    summary = compute_scan_summary(results)
    wb = Workbook()
    _build_summary_sheet(wb, scan_run, summary)
    _build_risk_sheet(wb, results)
    _build_detail_sheet(wb, results)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
