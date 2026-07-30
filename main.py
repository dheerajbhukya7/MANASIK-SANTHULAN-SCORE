
import joblib
from fastapi import FastAPI
from pydantic import BaseModel,Field
import pandas as pd
from typing import Literal  
from fastapi.middleware.cors import CORSMiddleware  



model = joblib.load('Mental_health_model.pkl')

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

#A first pydantic model to validate the input data

class StudentData(BaseModel):
    Age: int = Field(..., gt=10,le=100, description="Age of the student")
    Gender: Literal['Male', 'Female', 'Other'] = Field (..., description="Gender of the student")
    Country: str = Field(..., description="Country of the student")
    Academic_Level: Literal['High School', 'Undergraduate', 'Graduate'] = Field(..., description="Academic level of the student")
    Most_Used_Platform: Literal['Instagram', 'Facebook', 'Twitter', 'Snapchat', 'TikTok', 'Other'] = Field(..., description="Most used social media platform")
    Purpose_Of_Use: Literal['Entertainment', 'Education', 'Socializing', 'News', 'Other'] = Field(..., description="Purpose of social media use")
    Avg_Daily_Usage_Hours: float = Field(..., gt=0, le=24, description="Average daily usage hours of social media")
    Daily_Unlocks: int = Field(..., gt=0, description="Number of times the phone is unlocked daily")
    Study_Hours: float = Field(..., gt=0, le=24, description="Average daily study hours")
    Physical_Activity_Hours: float = Field(..., gt=0, le=24, description="Average daily physical activity hours")
    Sleep_Hours_Per_Night: float = Field(..., gt=0, le= 24, description="Average sleep hours per night")
    Stress_Level: Literal['Low', 'Medium', 'High', 'Very High'] = Field(..., description="Stress level of the student")    


#describe what we send back to the user after prediction
class PredictionResponse(BaseModel):
    prediction_mental_health_score: float   = Field(..., description="Predicted mental health status of the student")



@app.get("/")
def greet():
    return"Hello! Welcome to the Mental Health Prediction API. "  

top_countires = ['Other', 'India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France']

@app.post("/predict",response_model=PredictionResponse)
def predict(data: StudentData):
    country_group =data.Country if data.Country in top_countires else 'Other'
    input_row = pd.DataFrame([{
        'Age'                       : data.Age,
        'Gender'                    : data.Gender,
        'Country'                   : data.Country,
        'Academic_Level'            : data.Academic_Level,
        'Most_Used_Platform'        : data.Most_Used_Platform,
        'Purpose_Of_Use'            : data.Purpose_Of_Use   ,
        'Avg_Daily_Usage_Hours'     : data.Avg_Daily_Usage_Hours,
        'Daily_Unlocks'             : data.Daily_Unlocks,
        'Study_Hours'               : data.Study_Hours,
        'Physical_Activity_Hours'   : data.Physical_Activity_Hours,
        'Sleep_Hours_Per_Night'     : data.Sleep_Hours_Per_Night,
        'Stress_Level'              : data.Stress_Level,
        'Group_country'             : country_group
    }])

    prediction = model.predict(input_row)[0]
    return PredictionResponse(prediction_mental_health_score=round(float(prediction), 2))