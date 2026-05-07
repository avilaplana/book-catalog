from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from colophon.dependencies import get_jwt_service, get_session, get_verifier
from colophon.google_id_token_verifier import GoogleIdTokenVerifier
from colophon.jwt_token_service import JWTTokenService
from colophon.user_repository import UserRepository


class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str


router = APIRouter(prefix="/v1/auth")


@router.post("/google")
async def post_google(
    body: GoogleAuthRequest,
    verifier: GoogleIdTokenVerifier = Depends(get_verifier),
    jwt_service: JWTTokenService = Depends(get_jwt_service),
    session: AsyncSession = Depends(get_session),
) -> TokenPairResponse:
    identity = verifier.verify(body.id_token)
    repo = UserRepository(session)
    user = await repo.upsert_by_google_sub(
        google_sub=identity.google_sub,
        email=identity.email,
        display_name=identity.display_name,
        avatar_url=identity.avatar_url,
    )
    await session.commit()
    pair = jwt_service.issue_pair(user.id)
    return TokenPairResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
    )
