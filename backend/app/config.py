from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    google_client_id: str

    class Config:
        env_file = ".env"

settings = Settings()
