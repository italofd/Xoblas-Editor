from fastapi import APIRouter, HTTPException, Header
from database.postgresql_client import PostgreSQLInstance
from pydantic import BaseModel


from typing import Annotated


router = APIRouter()


class GetOutputsBody(BaseModel):
    quantity: int


@router.post(
    "/get_outputs",
    tags=["outputs"],
    name="Get Outputs",
    description="Use this endpoint to retrieve a number of your recent last inputs",
    status_code=200,
    # [TO-DO]: add response schema
)
async def get_outputs(
    body: GetOutputsBody,
    user_id: Annotated[str | None, Header(alias="X-Aqtakehome-User")],
):
    quantity = body.quantity

    try:
        result = PostgreSQLInstance.execute_query(
            """ 
        SELECT oc.*
        FROM executable e
        INNER JOIN output_code oc ON e.ID = oc.executable_id
        WHERE e.user_id = %s 
        LIMIT %s
            """,
            (user_id, quantity),
        )

        for row in result:
            print(row)

        return {"outputs": result}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail={"error": str(e)})
