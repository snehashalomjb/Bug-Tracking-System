import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("bug_tracker")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log HTTP request details, execution time, and status codes."""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            logger.info(
                f"Client: {request.client.host if request.client else 'Unknown'} | "
                f"Method: {request.method} | "
                f"Path: {request.url.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration:.4f}s"
            )
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: Method: {request.method} | Path: {request.url.path} | "
                f"Duration: {duration:.4f}s | Error: {str(e)}"
            )
            raise e
