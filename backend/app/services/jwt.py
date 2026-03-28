from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=ALGORITHM)

def verify_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    user_id: str = payload.get("sub")
    if user_id is None:
        raise JWTError("Token missing subject")
    return user_id
