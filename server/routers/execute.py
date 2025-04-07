from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from typing import Annotated


from routers.schemas.execute_schemas import ExecuteReqBody, execResponses
from run_safe_subprocess import run_client_code
from database.postgresql_client import PostgreSQLInstance
from routers.constants.messages import message_has_not_output, message_has_output


router = APIRouter()


@router.post(
    "/execute",
    tags=["execute"],
    name="Execute",
    description="Call this endpoint with a python valid code to execute in a running python environment",
    responses=execResponses,
)
async def execute(
    body: ExecuteReqBody,
    user_id: Annotated[str | None, Header(alias="X-Aqtakehome-User")],
):
    code = body.code
    should_save = body.should_save

    try:
        # Run the code in a safe env
        success, stdout, stderr = run_client_code(code).values()

        if success:
            message = message_has_output if len(stdout) > 0 else message_has_not_output
            status_code = 201 if should_save else 200

            if should_save:
                # Call postgres to add rows into "executable" and "code_output"
                PostgreSQLInstance.add_code_with_output(
                    code=code, output=stdout, userId=user_id
                )

            return JSONResponse(
                status_code=status_code,
                content={
                    "message": message,
                    "code_output": stdout,
                    # Avoiding extra return by return "have_inserted" dynamically
                    **({"have_inserted": True} if should_save else {}),
                },
            )

        print(stderr)
        raise HTTPException(status_code=400, detail={"error": stderr})

    except Exception as e:
        raise HTTPException(status_code=401, detail={"error": str(e)})
