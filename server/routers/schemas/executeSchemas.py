from pydantic import BaseModel


class ExecuteReqBody(BaseModel):
    code: str

class BaseExecuteResponse(BaseModel):
    message: str

class SuccessAndOutputExecuteResponse(BaseExecuteResponse):
    code_output: str

class ErrorExecuteResponse(BaseExecuteResponse):
    error: str

execResponses = {
    200: {
        "description": "Your code has executed correctly but didn't produce any output",
        "model": BaseExecuteResponse
    },
    201: {
        "description": "Your code has executed and returned an output sent back by the server",
        "model": SuccessAndOutputExecuteResponse
    },
    400: {
        "description": "Your code has failed to execute due to malformed code or malicious activity",
        "model": ErrorExecuteResponse
    }
}