from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Generator
from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Dynamic fallback to SQLite if MySQL is unreachable (e.g. running locally outside Docker)
try:
    if db_url.startswith("mysql"):
        # Test connection immediately
        temp_engine = create_engine(db_url, pool_pre_ping=True)
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
    else:
        engine = create_engine(db_url, connect_args=connect_args)
except Exception:
    import logging
    logger = logging.getLogger("bug_tracker")
    logger.warning("Unreachable MySQL target. Falling back to local SQLite database: sqlite:///./sql_app.db")
    db_url = "sqlite:///./sql_app.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    """Dependency injection yield for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
