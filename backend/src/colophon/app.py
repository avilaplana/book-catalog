from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from colophon.logging_config import configure_logging
from colophon.problem_details import register_problem_details_handlers
from colophon.routes.auth import router as auth_router
from colophon.routes.books import router as books_router
from colophon.routes.library import router as library_router


def create_app() -> FastAPI:
    load_dotenv(override=False)
    configure_logging()
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    register_problem_details_handlers(app)

    @app.get("/v1/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(books_router)
    app.include_router(library_router)

    return app


app = create_app()
