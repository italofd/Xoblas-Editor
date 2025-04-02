import sys
import io
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ExecuteReqBody(BaseModel):
    code: str

class BaseExecuteResponse(BaseModel):
    message: str

class SuccessAndOutputExecuteResponse(BaseExecuteResponse):
    code_output: str

class ErrorExecuteResponse(BaseExecuteResponse):
    error: str


@router.post("/execute", tags=["execute"], name="Execute", description="Call this endpoint with a python valid code to execute in a running python environment", responses={
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
})

async def execute(body: ExecuteReqBody):
    code = body.code

    buffer = io.StringIO()
    # Save the original stdout
    original_stdout = sys.stdout
    # Redirect stdout to our buffer
    sys.stdout = buffer

    output: str = None

    try:
        compiled = compile(code, "<string>", "exec")

        #This is not meant for product yet
        #We are not applying any rules or limits to the process that we are executing
        #Run this in a safe env when pushing to prod =)
        exec(compiled, {}, {})

        sys.stdout = original_stdout

        output = buffer.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if (output):
        return {
            "message": "Your code has executed with success and produced an output",
            "code_output": output
        } 
    return {
        "message": "Your code has executed with success but didn't produced any output"
    }
