from fastapi import APIRouter, HTTPException, Header
from database.postgresql_client import PostgreSQLInstance
from routers.schemas.output_schemas import GetOutputsBody, GetOutputsResponse


from typing import Annotated


router = APIRouter()


# Deprecated, not in use, just a piece of history =)
@router.post(
    "/get_outputs",
    tags=["outputs"],
    name="Get Outputs",
    description="Use this endpoint to retrieve a number of your recent last inputs",
    status_code=200,
    response_model=GetOutputsResponse,
)
async def get_outputs(
    body: GetOutputsBody,
    user_id: Annotated[str | None, Header(alias="X-xoblas-terminal-User")],
):
    quantity = body.quantity

    try:
        result: GetOutputsResponse = PostgreSQLInstance.execute_query(
            """ 
        SELECT oc.*
        FROM executable e
        INNER JOIN output_code oc ON e.ID = oc.executable_id
        WHERE e.user_id = %s 
        ORDER BY oc.timestamp DESC
        LIMIT %s
            """,
            (user_id, quantity),
        )

        return {"outputs": result}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail={"error": str(e)})
