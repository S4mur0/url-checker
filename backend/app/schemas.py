from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def normalize_hostname(value: str) -> str:
    value = value.strip()
    if value.startswith("https://"):
        value = value[len("https://"):]
    elif value.startswith("http://"):
        value = value[len("http://"):]
    return value.rstrip("/").lower()


class DomainCreate(BaseModel):
    hostname: str
    notes: str | None = None

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, value: str) -> str:
        normalized = normalize_hostname(value)
        if not normalized:
            raise ValueError("hostname vazio")
        return normalized


class DomainUpdate(BaseModel):
    hostname: str | None = None
    notes: str | None = None
    active: bool | None = None

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = normalize_hostname(value)
        if not normalized:
            raise ValueError("hostname vazio")
        return normalized


class DomainBulkCreate(BaseModel):
    text: str


class DomainBulkItem(BaseModel):
    hostname: str
    notes: str | None = None


class DomainBulkItemsCreate(BaseModel):
    items: list[DomainBulkItem]


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hostname: str
    notes: str | None
    active: bool
    created_at: datetime
    updated_at: datetime


class DomainBulkDelete(BaseModel):
    domain_ids: list[int]
    hard: bool = True


class ScanRunTrigger(BaseModel):
    domain_ids: list[int] | None = None
    concurrency: int = 30
    include_tls: bool = True

    @field_validator("concurrency")
    @classmethod
    def clamp_concurrency(cls, value: int) -> int:
        return max(1, min(value, 150))


class ScanResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain_id: int
    hostname: str
    checked_url: str
    status: str
    http_status_code: int | None
    error_message: str | None
    response_time_ms: float | None
    resolved_ip: str | None
    akamai_protected: bool
    akamai_signals: list[str]
    cname_chain: list[str]
    tls_issuer: str | None
    tls_expiry: datetime | None
    checked_at: datetime


class ScanRunSummary(BaseModel):
    total: int
    online: int
    warning: int
    offline: int
    protected: int
    unprotected: int
    unprotected_online: int
    unprotected_offline: int
    pct_online: float
    pct_protected: float


class ScanRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    finished_at: datetime | None
    status: str
    total_domains: int
    summary: ScanRunSummary | None = None


class ScanRunDetailOut(ScanRunOut):
    results: list[ScanResultOut]
