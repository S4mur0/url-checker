from fastapi import APIRouter, Depends
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.reporting.pdf_report import build_pdf_report
from app.reporting.xlsx_report import build_xlsx_report
from app.routers.scans import get_scan_run_or_404

router = APIRouter(prefix="/api/scan-runs", tags=["reports"])


@router.get("/{run_id}/report.xlsx")
def download_xlsx_report(run_id: int, db: Session = Depends(get_db)):
    run = get_scan_run_or_404(db, run_id)
    buffer = build_xlsx_report(run, run.results)
    filename = f"relatorio_waf_scan_{run_id}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{run_id}/report.pdf")
def download_pdf_report(run_id: int, db: Session = Depends(get_db)):
    run = get_scan_run_or_404(db, run_id)
    pdf_bytes = build_pdf_report(run, run.results)
    filename = f"relatorio_waf_scan_{run_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
