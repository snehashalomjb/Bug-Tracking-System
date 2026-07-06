import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.database.session import engine, SessionLocal
from app.models.base import Base
from app.routers import auth, users, projects, bugs, comments
from app.services.auth_service import AuthService
from app.middleware.error_handler import (
    global_exception_handler,
    validation_exception_handler,
    http_exception_handler
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("bug_tracker")

# Create tables if sqlite is used (for simplicity in development/testing without alembic runs)
# Note: For production, we will configure Alembic migrations.
if settings.DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Exception Handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# Seeding logic on startup
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        logger.info("Seeding roles...")
        AuthService.ensure_roles_seeded(db)
        logger.info("Roles seeded successfully.")
    except Exception as e:
        logger.error(f"Error during startup seeding: {e}")
    finally:
        db.close()

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(bugs.router, prefix=settings.API_V1_STR)
app.include_router(comments.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Bug Tracking System API"}
