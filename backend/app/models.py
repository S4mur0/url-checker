from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# Paleta fixa de cores para o avatar dos projetos - espelhada em
# frontend/src/utils/projectColors.js (sincronia manual, sem codegen).
PROJECT_COLOR_PALETTE = [
    "#3b82f6",  # blue (accent do app)
    "#10b981",  # green (status online)
    "#f59e0b",  # amber (status warning)
    "#ef4444",  # red (status offline)
    "#8b5cf6",  # purple
    "#ec4899",  # pink
    "#06b6d4",  # cyan
    "#6366f1",  # indigo
    "#14b8a6",  # teal
    "#f97316",  # orange
]


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (Index("ix_projects_name", "name", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default=PROJECT_COLOR_PALETTE[0])
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    domains: Mapped[list["Domain"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    scan_runs: Mapped[list["ScanRun"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Domain(Base):
    __tablename__ = "domains"
    __table_args__ = (
        Index("ix_domains_project_id_hostname", "project_id", "hostname", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship(back_populates="domains")
    results: Mapped[list["ScanResult"]] = relationship(
        back_populates="domain", cascade="all, delete-orphan"
    )


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | completed
    total_domains: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped["Project"] = relationship(back_populates="scan_runs")
    results: Mapped[list["ScanResult"]] = relationship(
        back_populates="scan_run", cascade="all, delete-orphan"
    )


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    scan_run_id: Mapped[int] = mapped_column(ForeignKey("scan_runs.id"), nullable=False, index=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("domains.id"), nullable=False, index=True)

    checked_url: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(10))  # ONLINE | WARNING | OFFLINE
    http_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_internal: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    akamai_protected: Mapped[bool] = mapped_column(Boolean, default=False)
    akamai_signals: Mapped[list] = mapped_column(JSON, default=list)
    cname_chain: Mapped[list] = mapped_column(JSON, default=list)

    tls_issuer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tls_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    s3_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # public | private | not_found | unknown
    s3_bucket_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    s3_source: Mapped[str | None] = mapped_column(String(20), nullable=True)  # cname_direct | cname_cdn | guess
    # nullable (não list, sem default) de propósito: coluna nova adicionada via
    # ALTER TABLE numa tabela com linhas existentes - essas linhas antigas ficam
    # com NULL no banco, e um default só no Python não retroage sobre elas.
    s3_signals: Mapped[list | None] = mapped_column(JSON, nullable=True)

    checked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    domain: Mapped["Domain"] = relationship(back_populates="results")
    scan_run: Mapped["ScanRun"] = relationship(back_populates="results")
