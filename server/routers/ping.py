from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class SuccessPingResponse(BaseModel):
    message: str


@router.post(
    "/ping",
    tags=["connection"],
    name="Ping",
    description="Call this endpoint to check if the server is up and running",
    responses={
        200: {"model": SuccessPingResponse},
        400: {
            "description": "Any code above 400 means that the server is not running, this endpoint just return a simple string after all"
        },
    },
)
def ping():
    return {"message": "Pong =)"}
