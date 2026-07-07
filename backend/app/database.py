from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "url_checker.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_missing_columns():
    """Migração leve: adiciona colunas novas do model em tabelas já existentes
    (sem tocar em dados). create_all() só cria tabelas ausentes, não altera
    tabelas existentes - isso cobre o caso de evoluir o schema sem apagar o
    banco (importante depois que já existem domínios/scans reais salvos)."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                if not column.nullable and column.default is None:
                    continue  # não dá pra adicionar NOT NULL sem default numa tabela com linhas
                col_type = column.type.compile(dialect=engine.dialect)
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'))


def _migrate_projects():
    """Migração dedicada: introduz Project e a FK obrigatória project_id em
    Domain/ScanRun. _add_missing_columns() pula colunas NOT NULL sem default -
    por isso essa função existe separadamente. Idempotente: segura de rodar em
    todo startup, nunca duplica o projeto padrão nem re-executa o backfill."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if "projects" not in existing_tables or "domains" not in existing_tables:
        return  # banco novo - create_all() já cria tudo no schema atual

    domain_cols = {c["name"] for c in inspector.get_columns("domains")}
    scan_run_cols = {c["name"] for c in inspector.get_columns("scan_runs")}
    domain_indexes = {ix["name"] for ix in inspector.get_indexes("domains")}

    needs_domain_col = "project_id" not in domain_cols
    needs_scan_run_col = "project_id" not in scan_run_cols

    with engine.begin() as conn:
        if needs_domain_col:
            conn.execute(text("ALTER TABLE domains ADD COLUMN project_id INTEGER"))
        if needs_scan_run_col:
            conn.execute(text("ALTER TABLE scan_runs ADD COLUMN project_id INTEGER"))

        orphan_domains = conn.execute(
            text("SELECT COUNT(*) FROM domains WHERE project_id IS NULL")
        ).scalar()
        orphan_runs = conn.execute(
            text("SELECT COUNT(*) FROM scan_runs WHERE project_id IS NULL")
        ).scalar()

        if orphan_domains or orphan_runs:
            default_id = conn.execute(text("SELECT id FROM projects ORDER BY id LIMIT 1")).scalar()
            if default_id is None:
                now = datetime.now(timezone.utc)
                result = conn.execute(
                    text(
                        "INSERT INTO projects (name, description, color, created_at, updated_at) "
                        "VALUES (:name, :description, :color, :now, :now)"
                    ),
                    {
                        "name": "Meus Domínios",
                        "description": "Criado automaticamente ao migrar dados existentes para o modelo de projetos.",
                        "color": "#3b82f6",
                        "now": now,
                    },
                )
                default_id = result.lastrowid
            if orphan_domains:
                conn.execute(
                    text("UPDATE domains SET project_id = :pid WHERE project_id IS NULL"),
                    {"pid": default_id},
                )
            if orphan_runs:
                conn.execute(
                    text("UPDATE scan_runs SET project_id = :pid WHERE project_id IS NULL"),
                    {"pid": default_id},
                )

        if "ix_domains_hostname" in domain_indexes:
            conn.execute(text("DROP INDEX ix_domains_hostname"))
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_domains_project_id_hostname "
                "ON domains (project_id, hostname)"
            )
        )


def init_db():
    from app import models  # noqa: F401  (ensure models are registered on Base)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
    _migrate_projects()
