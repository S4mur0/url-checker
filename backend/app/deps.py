from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project


def get_project_or_404(project_id: int, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project
