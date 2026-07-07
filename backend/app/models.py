from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Domain(Base):
    __tablename__ = "domains"

    id: Mapped[int] = mapped_column(primary_key=True)
    hostname: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    results: Mapped[list["ScanResult"]] = relationship(
        back_populates="domain", cascade="all, delete-orphan"
    )


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | completed
    total_domains: Mapped[int] = mapped_column(Integer, default=0)

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

    akamai_protected: Mapped[bool] = mapped_column(Boolean, default=False)
    akamai_signals: Mapped[list] = mapped_column(JSON, default=list)
    cname_chain: Mapped[list] = mapped_column(JSON, default=list)

    tls_issuer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tls_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    checked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    domain: Mapped["Domain"] = relationship(back_populates="results")
    scan_run: Mapped["ScanRun"] = relationship(back_populates="results")
