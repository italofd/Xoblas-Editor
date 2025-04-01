from fastapi import FastAPI
from scipy import constants
import pandas

mydataset = {
  'cars': ["BMW", "Volvo", "Ford"],
  'passings': [3, 7, 2]
}



app = FastAPI()


@app.get("/")
async def root():
    #This is just a test to see if all the libraries are working as expected
    #Remove when building the complete version =)
    return {f"message: Hello World {constants.liter} {pandas.DataFrame(mydataset)}"}