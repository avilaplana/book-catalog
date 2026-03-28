from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(tags=["profile"])

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email}
