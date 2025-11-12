from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI()

class Inputs(BaseModel):
    age: int = Field(ge=0, le=100)
    currentSavings: float = Field(ge=0)
    monthlyContribution: float = Field(ge=0)
    expectedReturn: float
    inflation: float
    targetNestEgg: float = Field(ge=0)
    retirementAge: int = Field(ge=30, le=100)

class ProjectionPoint(BaseModel):
    age: int
    balance_nominal: float
    balance_real: float

class MathResult(BaseModel):
    years_to_target: Optional[int]
    reached: bool
    projections: List[ProjectionPoint]

@app.post("/api/compute")
def compute(inputs: Inputs) -> MathResult:
    balance = inputs.currentSavings
    proj: List[ProjectionPoint] = []
    reached = False
    hit_years: Optional[int] = None

    age_now = inputs.age
    years = 0
    # simulate year by year until retirementAge (exclusive)
    while age_now + years < inputs.retirementAge:
        balance = balance * (1 + inputs.expectedReturn) + inputs.monthlyContribution * 12
        real = balance / ((1 + inputs.inflation) ** (years + 1))
        proj.append(ProjectionPoint(
            age=age_now + years + 1,
            balance_nominal=round(balance, 2),
            balance_real=round(real, 2)
        ))
        if not reached and balance >= inputs.targetNestEgg:
            reached = True
            hit_years = years + 1
        years += 1

    return MathResult(years_to_target=hit_years, reached=reached, projections=proj)
