import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import SessionLocal, get_db
from app.models import Domain, ScanResult, ScanRun
from app.reporting.summary import compute_scan_summary
from app.schemas import ScanResultOut, ScanRunDetailOut, ScanRunOut, ScanRunTrigger

from app.scanner.orchestrator import run_scan

router = APIRouter(prefix="/api/scan-runs", tags=["scans"])


def _result_to_out(result: ScanResult) -> ScanResultOut:
    return ScanResultOut(
        id=result.id,
        domain_id=result.domain_id,
        hostname=result.domain.hostname,
        checked_url=result.checked_url,
        status=result.status,
        http_status_code=result.http_status_code,
        error_message=result.error_message,
        response_time_ms=result.response_time_ms,
        resolved_ip=result.resolved_ip,
        akamai_protected=result.akamai_protected,
        akamai_signals=result.akamai_signals,
        cname_chain=result.cname_chain,
        tls_issuer=result.tls_issuer,
        tls_expiry=result.tls_expiry,
        checked_at=result.checked_at,
    )


def get_scan_run_or_404(db: Session, run_id: int) -> ScanRun:
    stmt = (
        select(ScanRun)
        .options(selectinload(ScanRun.results).selectinload(ScanResult.domain))
        .where(ScanRun.id == run_id)
    )
    run = db.execute(stmt).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Scan run não encontrado")
    return run


@router.post("/stream")
def trigger_scan_stream(payload: ScanRunTrigger, db: Session = Depends(get_db)):
    if payload.domain_ids:
        stmt = select(Domain).where(Domain.id.in_(payload.domain_ids))
    else:
        stmt = select(Domain).where(Domain.active == True)  # noqa: E712
    domains = db.execute(stmt).scalars().all()
    if not domains:
        raise HTTPException(status_code=400, detail="Nenhum domínio para escanear")

    scan_run = ScanRun(status="running", total_domains=len(domains))
    db.add(scan_run)
    db.commit()
    db.refresh(scan_run)

    run_id = scan_run.id
    domain_snapshot = [(d.id, d.hostname) for d in domains]
    concurrency = payload.concurrency
    include_tls = payload.include_tls

    async def event_generator() -> AsyncIterator[bytes]:
        session = SessionLocal()
        try:
            domains_for_scan = [Domain(id=did, hostname=hostname) for did, hostname in domain_snapshot]
            async for result in run_scan(domains_for_scan, concurrency=concurrency, include_tls=include_tls):
                scan_result = ScanResult(
                    scan_run_id=run_id,
                    domain_id=result.domain_id,
                    checked_url=result.checked_url,
                    status=result.status,
                    http_status_code=result.http_status_code,
                    error_message=result.error_message,
                    response_time_ms=result.response_time_ms,
                    resolved_ip=result.resolved_ip,
                    akamai_protected=result.akamai_protected,
                    akamai_signals=result.akamai_signals,
                    cname_chain=result.cname_chain,
                    tls_issuer=result.tls_issuer,
                    tls_expiry=result.tls_expiry,
                )
                session.add(scan_result)
                session.commit()

                event = {
                    "id": scan_result.id,
                    "domain_id": result.domain_id,
                    "hostname": result.hostname,
                    "checked_url": result.checked_url,
                    "status": result.status,
                    "http_status_code": result.http_status_code,
                    "error_message": result.error_message,
                    "response_time_ms": result.response_time_ms,
                    "resolved_ip": result.resolved_ip,
                    "akamai_protected": result.akamai_protected,
                    "akamai_signals": result.akamai_signals,
                    "cname_chain": result.cname_chain,
                    "tls_issuer": result.tls_issuer,
                    "tls_expiry": result.tls_expiry.isoformat() if result.tls_expiry else None,
                }
                yield f"data: {json.dumps(event)}\n\n".encode()

            run = session.get(ScanRun, run_id)
            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)
            session.commit()
            yield f"event: done\ndata: {json.dumps({'run_id': run_id})}\n\n".encode()
        finally:
            session.close()

    response = StreamingResponse(event_generator(), media_type="text/event-stream")
    response.headers["X-Scan-Run-Id"] = str(run_id)
    return response


@router.get("", response_model=list[ScanRunOut])
def list_scan_runs(db: Session = Depends(get_db)):
    stmt = (
        select(ScanRun)
        .options(selectinload(ScanRun.results))
        .order_by(ScanRun.started_at.desc())
    )
    runs = db.execute(stmt).scalars().all()
    return [
        ScanRunOut(
            id=run.id,
            started_at=run.started_at,
            finished_at=run.finished_at,
            status=run.status,
            total_domains=run.total_domains,
            summary=compute_scan_summary(run.results),
        )
        for run in runs
    ]


@router.get("/{run_id}", response_model=ScanRunDetailOut)
def get_scan_run(run_id: int, db: Session = Depends(get_db)):
    run = get_scan_run_or_404(db, run_id)
    return ScanRunDetailOut(
        id=run.id,
        started_at=run.started_at,
        finished_at=run.finished_at,
        status=run.status,
        total_domains=run.total_domains,
        summary=compute_scan_summary(run.results),
        results=[_result_to_out(r) for r in run.results],
    )
