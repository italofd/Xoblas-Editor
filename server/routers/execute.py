from fastapi import APIRouter, HTTPException
from routers.schemas.execute_schemas import ExecuteReqBody, execResponses
from run_safe_subprocess import run_client_code
from database.postgresql_client import PostgreSQLInstance

message_has_output = "Your code has executed with success and produced an output"

message_has_not_output = (
    "Your code has executed with success but didn't produced any output"
)

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

    try:
        success, stdout, stderr = run_client_code(code).values()

        if success:
            if should_save:
                PostgreSQLInstance.add_code_with_output(code=code, output=stdout)

            return {
                "message": (
                    message_has_output if len(stdout) > 0 else message_has_not_output
                ),
                "code_output": stdout,
            }

        raise HTTPException(status_code=400, detail={"error": stderr})

    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
