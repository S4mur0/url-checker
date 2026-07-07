import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_project_or_404
from app.models import PROJECT_COLOR_PALETTE, Domain, Project, ScanRun
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_out(db: Session, project: Project) -> ProjectOut:
    domain_count = db.execute(
        select(func.count()).select_from(Domain).where(Domain.project_id == project.id)
    ).scalar_one()
    active_domain_count = db.execute(
        select(func.count())
        .select_from(Domain)
        .where(Domain.project_id == project.id, Domain.active == True)  # noqa: E712
    ).scalar_one()
    last_scan_at = db.execute(
        select(func.max(ScanRun.started_at)).where(ScanRun.project_id == project.id)
    ).scalar_one()

    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        created_at=project.created_at,
        updated_at=project.updated_at,
        domain_count=domain_count,
        active_domain_count=active_domain_count,
        last_scan_at=last_scan_at,
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.execute(select(Project).order_by(Project.name)).scalars().all()
    return [_to_out(db, p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Project).where(Project.name == payload.name)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Já existe um projeto com esse nome")

    color = payload.color or random.choice(PROJECT_COLOR_PALETTE)
    project = Project(name=payload.name, description=payload.description, color=color)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_out(db, project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project: Project = Depends(get_project_or_404), db: Session = Depends(get_db)):
    return _to_out(db, project)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    payload: ProjectUpdate,
    project: Project = Depends(get_project_or_404),
    db: Session = Depends(get_db),
):
    if payload.name is not None and payload.name != project.name:
        existing = db.execute(select(Project).where(Project.name == payload.name)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Já existe um projeto com esse nome")
        project.name = payload.name

    if payload.description is not None:
        project.description = payload.description
    if payload.color is not None:
        project.color = payload.color

    db.commit()
    db.refresh(project)
    return _to_out(db, project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project: Project = Depends(get_project_or_404), db: Session = Depends(get_db)):
    db.delete(project)
    db.commit()
