import os

from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routers import (
    ping,
    execute,
    get_outputs,
    web_socket,
    lsp_socket,
    filesystem_socket,
)


load_dotenv()

app = FastAPI()


origins = (
    [
        "http://localhost",
        "http://localhost:3000",
    ]
    if os.getenv("ENV") != "prod"
    else [
        "https://aq-take-home.vercel.app",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ping.router)
app.include_router(execute.router)
app.include_router(get_outputs.router)
app.include_router(web_socket.router)
app.include_router(lsp_socket.router)
app.include_router(filesystem_socket.router)


@app.get("/")
async def root():
    return "Tenha Fé, Pois Amanhã Um Lindo Dia Vai Nascer - Originais do Samba"
