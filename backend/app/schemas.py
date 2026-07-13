from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models import PROJECT_COLOR_PALETTE


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("nome vazio")
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is not None and value not in PROJECT_COLOR_PALETTE:
            raise ValueError("cor fora da paleta permitida")
        return value


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("nome vazio")
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is not None and value not in PROJECT_COLOR_PALETTE:
            raise ValueError("cor fora da paleta permitida")
        return value


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    color: str
    created_at: datetime
    updated_at: datetime
    domain_count: int = 0
    active_domain_count: int = 0
    last_scan_at: datetime | None = None


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


class DiscoveredSubdomain(BaseModel):
    hostname: str
    already_tracked: bool


class DiscoverResponse(BaseModel):
    root_domain: str
    candidates: list[DiscoveredSubdomain]
    truncated: bool
    ok: bool


class ScanRunTrigger(BaseModel):
    domain_ids: list[int] | None = None
    concurrency: int = 30
    include_tls: bool = True
    check_s3: bool = True

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
    is_internal: bool | None
    akamai_protected: bool
    akamai_signals: list[str]
    cname_chain: list[str]
    tls_issuer: str | None
    tls_expiry: datetime | None
    s3_status: str | None
    s3_bucket_name: str | None
    s3_source: str | None
    s3_signals: list[str]
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
    internal_count: int
    external_count: int
    unknown_exposure_count: int
    external_unprotected_online: int
    internal_unprotected_online: int
    s3_public_count: int
    s3_checked_count: int
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
