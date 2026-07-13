from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_project_or_404
from app.models import Domain, Project
from app.scanner.ct_discovery import discover_subdomains
from app.schemas import (
    DiscoverResponse,
    DiscoveredSubdomain,
    DomainBulkCreate,
    DomainBulkDelete,
    DomainBulkItemsCreate,
    DomainCreate,
    DomainOut,
    DomainUpdate,
    normalize_hostname,
)

router = APIRouter(prefix="/api/projects/{project_id}/domains", tags=["domains"])


def _bulk_insert(db: Session, project_id: int, rows: list[tuple[str, str | None]]) -> dict:
    """rows: lista de (hostname_bruto, notes_opcional). Normaliza, deduplica contra o
    banco (escopado ao projeto) e dentro do próprio lote, e insere tudo numa única
    transação."""
    existing_hosts = {
        h for (h,) in db.execute(select(Domain.hostname).where(Domain.project_id == project_id))
    }

    created: list[str] = []
    skipped: list[str] = []
    seen_in_batch: set[str] = set()

    for raw_hostname, notes in rows:
        try:
            hostname = normalize_hostname(raw_hostname)
        except Exception:
            skipped.append(raw_hostname)
            continue
        if not hostname or hostname in existing_hosts or hostname in seen_in_batch:
            skipped.append(raw_hostname)
            continue
        seen_in_batch.add(hostname)
        db.add(Domain(project_id=project_id, hostname=hostname, notes=notes or None))
        created.append(hostname)

    db.commit()
    return {"created": created, "skipped": skipped}


@router.get("", response_model=list[DomainOut])
def list_domains(
    active: bool | None = None,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    stmt = select(Domain).where(Domain.project_id == project.id)
    if active is not None:
        stmt = stmt.where(Domain.active == active)
    stmt = stmt.order_by(Domain.hostname)
    return db.execute(stmt).scalars().all()


@router.post("", response_model=DomainOut, status_code=201)
def create_domain(
    payload: DomainCreate,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    existing = db.execute(
        select(Domain).where(Domain.project_id == project.id, Domain.hostname == payload.hostname)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Domínio já cadastrado neste projeto")
    domain = Domain(project_id=project.id, hostname=payload.hostname, notes=payload.notes)
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain


@router.post("/bulk")
def bulk_create_domains(
    payload: DomainBulkCreate,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    lines = [line.strip() for line in payload.text.splitlines() if line.strip()]
    return _bulk_insert(db, project.id, [(line, None) for line in lines])


@router.post("/bulk-items")
def bulk_create_domain_items(
    payload: DomainBulkItemsCreate,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    rows = [(item.hostname, item.notes) for item in payload.items if item.hostname.strip()]
    return _bulk_insert(db, project.id, rows)


@router.get("/discover", response_model=DiscoverResponse)
async def discover(
    root_domain: str,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    root = normalize_hostname(root_domain)
    if not root:
        raise HTTPException(status_code=400, detail="domínio raiz vazio")

    result = await discover_subdomains(root)

    tracked = {
        h for (h,) in db.execute(select(Domain.hostname).where(Domain.project_id == project.id))
    }
    candidates = [
        DiscoveredSubdomain(hostname=h, already_tracked=h in tracked)
        for h in result["candidates"]
    ]
    return DiscoverResponse(
        root_domain=result["root_domain"],
        candidates=candidates,
        truncated=result["truncated"],
        ok=result["ok"],
    )


@router.get("/{domain_id}", response_model=DomainOut)
def get_domain(
    domain_id: int,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    domain = db.get(Domain, domain_id)
    if not domain or domain.project_id != project.id:
        raise HTTPException(status_code=404, detail="Domínio não encontrado")
    return domain


@router.put("/{domain_id}", response_model=DomainOut)
def update_domain(
    domain_id: int,
    payload: DomainUpdate,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    domain = db.get(Domain, domain_id)
    if not domain or domain.project_id != project.id:
        raise HTTPException(status_code=404, detail="Domínio não encontrado")

    if payload.hostname is not None and payload.hostname != domain.hostname:
        existing = db.execute(
            select(Domain).where(Domain.project_id == project.id, Domain.hostname == payload.hostname)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Domínio já cadastrado neste projeto")
        domain.hostname = payload.hostname

    if payload.notes is not None:
        domain.notes = payload.notes
    if payload.active is not None:
        domain.active = payload.active

    db.commit()
    db.refresh(domain)
    return domain


@router.delete("/{domain_id}", status_code=204)
def delete_domain(
    domain_id: int,
    hard: bool = False,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    domain = db.get(Domain, domain_id)
    if not domain or domain.project_id != project.id:
        raise HTTPException(status_code=404, detail="Domínio não encontrado")

    if hard:
        db.delete(domain)
    else:
        domain.active = False
    db.commit()


@router.post("/bulk-delete")
def bulk_delete_domains(
    payload: DomainBulkDelete,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    domains = db.execute(
        select(Domain).where(Domain.id.in_(payload.domain_ids), Domain.project_id == project.id)
    ).scalars().all()

    if payload.hard:
        for domain in domains:
            db.delete(domain)
    else:
        for domain in domains:
            domain.active = False

    db.commit()
    return {"deleted": len(domains)}
