from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from colophon.google_id_token_verifier import InvalidGoogleIdToken


def register_problem_details_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidGoogleIdToken)
    async def _invalid_google_id_token(
        request: Request, exc: InvalidGoogleIdToken
    ) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            media_type="application/problem+json",
            content={
                "type": "/problems/invalid-google-id-token",
                "title": "Invalid Google ID token",
                "status": 401,
            },
        )
