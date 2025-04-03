from fastapi import APIRouter, HTTPException
import pandas as pd
import scipy
from RestrictedPython import compile_restricted, safe_globals, PrintCollector
from database.client import SQLiteClient
from routers.schemas.execute_schemas import ExecuteReqBody, execResponses

router = APIRouter()


@router.post(
    "/execute",
    tags=["execute"],
    name="Execute",
    description="Call this endpoint with a python valid code to execute in a running python environment",
    responses=execResponses,
)
async def execute(body: ExecuteReqBody):
    code = body.code
    should_save = body.should_save

    globals = dict(safe_globals)

    # Add panda and scipy to dict based on safe_globals
    globals["pd"] = pd
    globals["scipy"] = scipy

    # Add printCollector as suggested by documentation
    globals["_print_"] = PrintCollector

    try:
        # Compile the code in restricted mode
        compiled = compile_restricted(code, filename="<inline code>", mode="exec")

        # Local namespace for execution
        locals = {}

        # Execute the compiled code
        exec(compiled, globals, locals)

        _output_ = locals.get("result")

        if should_save:
            client = SQLiteClient()
            client.add_code_with_output(code=code, output=_output_)

        if _output_:
            return {
                "message": "Your code has executed with success and produced an output",
                "code_output": _output_,
            }

        return {
            "message": "Your code has executed with success but didn't produced any output"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
