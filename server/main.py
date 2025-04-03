from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from scipy import constants
import pandas

from routers import ping, execute

app = FastAPI()

# [TO-DO]: Make this be dynamically targeting depending if its local or prod
origins = [
    "http://localhost",
    "http://localhost:3000",
    "https://aq-take-home.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ping.router)
app.include_router(execute.router)


mydataset = {"cars": ["BMW", "Volvo", "Ford"], "passings": [3, 7, 2]}


@app.get("/")
async def root():
    # This is just a test to see if all the libraries are working as expected
    # Remove when building the complete version =)
    return {f"message: Hello World {constants.liter} {pandas.DataFrame(mydataset)}"}
