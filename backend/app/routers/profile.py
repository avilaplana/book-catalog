from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserBook, Shelf, ReadingStatus
from app.schemas.profile import ProfileResponse, StatusCounts

router = APIRouter(tags=["profile"])

@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_books = db.query(UserBook).filter(UserBook.user_id == current_user.id).all()
    shelf_count = db.query(Shelf).filter(Shelf.user_id == current_user.id).count()
    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        total_books=len(user_books),
        status_counts=StatusCounts(
            want_to_read=sum(1 for ub in user_books if ub.status == ReadingStatus.want_to_read),
            currently_reading=sum(1 for ub in user_books if ub.status == ReadingStatus.currently_reading),
            read=sum(1 for ub in user_books if ub.status == ReadingStatus.read),
        ),
        shelf_count=shelf_count,
    )
