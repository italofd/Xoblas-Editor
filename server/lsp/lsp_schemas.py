from pydantic import BaseModel
from typing import Optional, Any, Dict


class LSPCompletionRequest(BaseModel):
    language: str
    file_path: str
    line: int
    character: int
    text: str


class LSPHoverRequest(BaseModel):
    language: str
    file_path: str
    line: int
    character: int
    text: str


class LSPDiagnosticsRequest(BaseModel):
    language: str
    file_path: str
    text: str


class LSPResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class LSPSupportedLanguagesResponse(BaseModel):
    languages: list
