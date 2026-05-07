from fastapi import APIRouter, Depends

from colophon.dependencies import get_current_user
from colophon.models import User

router = APIRouter(prefix="/v1/library")


@router.get("/books")
async def list_books(user: User = Depends(get_current_user)) -> list:
    return []
