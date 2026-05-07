from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from colophon.problem_details import register_problem_details_handlers
from colophon.routes.auth import router as auth_router
from colophon.routes.library import router as library_router


def create_app() -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_problem_details_handlers(app)

    @app.get("/v1/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(library_router)

    return app


app = create_app()
