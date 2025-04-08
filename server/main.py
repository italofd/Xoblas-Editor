import os

from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from routers import ping, execute, get_outputs
from database.postgresql_client import PostgreSQLInstance


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


mydataset = {"cars": ["BMW", "Volvo", "Ford"], "passings": [3, 7, 2]}


@app.get("/")
async def root():
    # This is just a test to see if all the libraries are working as expected
    # Remove when building the complete version =)
    return "Tenha Fé, Pois Amanhã Um Lindo Dia Vai Nascer - Originais do Samba"
