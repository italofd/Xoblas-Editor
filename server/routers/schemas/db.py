from pydantic import BaseModel


class ExecutableDB(BaseModel):
    id: str
    code: str
    user_id: str


class OutputCodeDB(BaseModel):
    id: str
    executable_id: str  # Foreign key to Executable.id
    output: str
    timestamp: int  # UNIX timestamp
