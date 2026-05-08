import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from colophon.google_books_client import GoogleBooksUnavailable
from colophon.google_id_token_verifier import InvalidGoogleIdToken
from colophon.jwt_token_service import InvalidToken

logger = structlog.get_logger()


def register_problem_details_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidGoogleIdToken)
    async def _invalid_google_id_token(
        request: Request, exc: InvalidGoogleIdToken
    ) -> JSONResponse:
        logger.info("invalid_google_id_token", path=request.url.path)
        return JSONResponse(
            status_code=401,
            media_type="application/problem+json",
            content={
                "type": "/problems/invalid-google-id-token",
                "title": "Invalid Google ID token",
                "status": 401,
            },
        )

    @app.exception_handler(InvalidToken)
    async def _invalid_token(request: Request, exc: InvalidToken) -> JSONResponse:
        logger.info("invalid_token", path=request.url.path)
        return JSONResponse(
            status_code=401,
            media_type="application/problem+json",
            content={
                "type": "/problems/invalid-token",
                "title": "Invalid token",
                "status": 401,
            },
        )

    @app.exception_handler(GoogleBooksUnavailable)
    async def _google_books_unavailable(
        request: Request, exc: GoogleBooksUnavailable
    ) -> JSONResponse:
        logger.warning("google_books_unavailable", path=request.url.path)
        return JSONResponse(
            status_code=503,
            media_type="application/problem+json",
            content={
                "type": "/problems/google-books-unavailable",
                "title": "Google Books unavailable",
                "status": 503,
            },
        )
