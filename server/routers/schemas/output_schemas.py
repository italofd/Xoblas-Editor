from pydantic import BaseModel
from typing import List
from routers.schemas.db import OutputCodeDB


class GetOutputsBody(BaseModel):
    quantity: int


class GetOutputsResponse(BaseModel):
    outputs: List[OutputCodeDB]
