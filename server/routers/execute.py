from fastapi import APIRouter, HTTPException
import pandas as pd
import scipy
from RestrictedPython import compile_restricted, safe_globals, PrintCollector
from routers.schemas.executeSchemas import *  

router = APIRouter()

@router.post("/execute", tags=["execute"], name="Execute", description="Call this endpoint with a python valid code to execute in a running python environment", responses=execResponses)
async def execute(body: ExecuteReqBody):
    code = body.code

    globals = dict(safe_globals)
    
    #Add panda and scipy to dict based on safe_globals
    globals['pd'] = pd
    globals['scipy'] = scipy

    #Add printCollector as suggested by documentation
    globals["_print_"] = PrintCollector


    try:
        # Compile the code in restricted mode
        byte_code = compile_restricted(
            code,
            filename="<inline code>",
            mode="exec"
        )
                
        # Local namespace for execution
        locals = {}
        
        # Execute the compiled code
        exec(byte_code, globals, locals)

        _output_ = locals.get("result")

        if (_output_):
            return {
                "message": "Your code has executed with success and produced an output",
                "code_output": _output_
            }
        
        return {
            "message": "Your code has executed with success but didn't produced any output"
        } 

    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})