from pathlib import Path
import math

import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/api/ml", tags=["ML Prediction"])

MODEL_PATH = Path(__file__).resolve().parent / "flood_rf_model.joblib"

class FloodInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rainfall_mm_24h: float = Field(ge=0, le=1000, allow_inf_nan=False)
    rainfall_mm_3d: float = Field(ge=0, le=3000, allow_inf_nan=False)
    water_level_pct: float = Field(ge=0, le=100, allow_inf_nan=False)
    drainage_capacity_pct: float = Field(ge=0, le=100, allow_inf_nan=False)

EXPECTED_FEATURES = [
    "rainfall_mm_24h",
    "rainfall_mm_3d",
    "water_level_pct",
    "drainage_capacity_pct",
]

# Only load your trusted, locally created model.
bundle = joblib.load(MODEL_PATH)
model = bundle["model"]

if list(bundle["features"]) != EXPECTED_FEATURES:
    raise RuntimeError("Model feature mismatch")

@router.post("/predict")
def predict_flood(data: FloodInput):
    try:
        values = [[
            data.rainfall_mm_24h,
            data.rainfall_mm_3d,
            data.water_level_pct,
            data.drainage_capacity_pct,
        ]]

        prediction = str(model.predict(values)[0])
        probabilities = model.predict_proba(values)[0]

        return {
            "risk_level": prediction,
            "class_probabilities": {
                str(label): round(float(prob), 4)
                for label, prob in zip(model.classes_, probabilities)
            },
            "model_name": "Random Forest Classifier",
            "experimental": True,
            "data_source": "synthetic"
        }
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="ML prediction failed"
        )
