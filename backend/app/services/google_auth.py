from google.oauth2 import id_token
from google.auth.transport import requests
from app.config import settings

def verify_google_token(token: str) -> dict:
    idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.google_client_id)
    return {
        "google_id": idinfo["sub"],
        "email": idinfo["email"],
        "display_name": idinfo.get("name", ""),
        "avatar_url": idinfo.get("picture"),
    }
