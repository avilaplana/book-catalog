from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from colophon.routes.auth import router as auth_router


def create_app() -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/v1/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router)

    return app


app = create_app()
