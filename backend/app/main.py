from fastapi import FastAPI

from app.database import init_db
from app.routers import domains, projects, reports, scans

app = FastAPI(title="Auditor de Cobertura WAF (Akamai)")

app.include_router(projects.router)
app.include_router(domains.router)
app.include_router(scans.router)
app.include_router(reports.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
