import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("bug_tracker")

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log and format all uncaught generic exceptions."""
    logger.exception(f"Unhandled exception occurred on path: {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please contact the administrator."}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format Pydantic and FastAPI validation errors for clean client presentation."""
    errors = []
    for error in exc.errors():
        # Convert path tuple to dot notation, skipping 'body' prefix if present
        loc = error.get("loc", [])
        loc_str = ".".join(str(x) for x in loc if x != "body")
        msg = error.get("msg")
        errors.append({"field": loc_str or "request", "message": msg})
        
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Input validation failed.",
            "errors": errors
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Pass through Starlette/FastAPI HTTPExceptions directly."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
