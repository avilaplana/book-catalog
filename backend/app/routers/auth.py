from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import GoogleAuthRequest, TokenResponse
from app.services.google_auth import verify_google_token
from app.services.jwt import create_access_token
from app.models import User

router = APIRouter(tags=["auth"])

@router.post("/auth/google", response_model=TokenResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        google_data = verify_google_token(request.id_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    user = db.query(User).filter(User.google_id == google_data["google_id"]).first()
    if user is None:
        user = User(
            google_id=google_data["google_id"],
            email=google_data["email"],
            display_name=google_data["display_name"],
            avatar_url=google_data["avatar_url"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return TokenResponse(access_token=create_access_token(str(user.id)))
