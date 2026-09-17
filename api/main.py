from pathlib import Path
import os

import joblib
import pandas as pd
import shap

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from groq import Groq

from fastapi.middleware.cors import CORSMiddleware
# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "churn_model.pkl"

ENV_PATH = BASE_DIR / ".env"


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv(ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# =========================================================
# LOAD MODEL
# =========================================================

model = joblib.load(MODEL_PATH)

preprocessor = model.named_steps["preprocessor"]
classifier = model.named_steps["classifier"]


# =========================================================
# SHAP EXPLAINER
# =========================================================

explainer = shap.TreeExplainer(classifier)


# =========================================================
# GROQ CLIENT
# =========================================================

groq_client = None

if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Customer Churn Prediction API",
    description="ML-powered customer churn prediction with SHAP and Groq explanations.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# INPUT SCHEMA
# =========================================================

class CustomerData(BaseModel):

    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int

    PhoneService: str
    MultipleLines: str

    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str

    Contract: str
    PaperlessBilling: str
    PaymentMethod: str

    MonthlyCharges: float
    TotalCharges: float


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
def root():

    return {
        "message": "Customer Churn Prediction API is running",
        "status": "healthy"
    }


# =========================================================
# PREDICTION ENDPOINT
# =========================================================

@app.post("/predict")
def predict(customer: CustomerData):

    # Convert request into DataFrame
    customer_dict = customer.model_dump()

    input_df = pd.DataFrame([customer_dict])

    # -----------------------------------------------------
    # Prediction
    # -----------------------------------------------------

    probability = model.predict_proba(input_df)[0, 1]

    prediction = int(probability >= 0.5)

    prediction_label = (
        "Churn" if prediction == 1 else "No Churn"
    )

    # -----------------------------------------------------
    # SHAP
    # -----------------------------------------------------

    transformed_data = preprocessor.transform(input_df)

    shap_values = explainer.shap_values(transformed_data)

    # Handle SHAP output format
    if isinstance(shap_values, list):

        customer_shap = shap_values[1][0]

    else:

        if len(shap_values.shape) == 3:
            customer_shap = shap_values[0, :, 1]
        else:
            customer_shap = shap_values[0]

    # -----------------------------------------------------
    # Feature importance
    # -----------------------------------------------------

    feature_names = preprocessor.get_feature_names_out()

    feature_importance = []

    for feature, value in zip(
        feature_names,
        customer_shap
    ):

        feature_importance.append({
            "feature": feature,
            "shap_value": float(value),
            "impact": (
                "increases churn risk"
                if value > 0
                else "decreases churn risk"
            )
        })

    # Sort by absolute SHAP impact
    feature_importance = sorted(
        feature_importance,
        key=lambda x: abs(x["shap_value"]),
        reverse=True
    )

    # Keep top 10 factors
    top_features = feature_importance[:10]

    # -----------------------------------------------------
    # Groq explanation
    # -----------------------------------------------------

    explanation = (
        "Groq API key is not configured."
    )

    if groq_client:

        factors_text = "\n".join(
            [
                f"- {item['feature']}: "
                f"{item['shap_value']:.4f} "
                f"({item['impact']})"
                for item in top_features
            ]
        )

        prompt = f"""
You are explaining a machine learning customer churn prediction
to a business user.

Prediction:
{prediction_label}

Churn probability:
{probability:.2%}

The following are the most influential SHAP features for this
specific customer:

{factors_text}

Write a concise explanation in plain English.

Requirements:
- Explain the main factors influencing the prediction.
- Do not invent customer information.
- Do not claim that a factor guarantees churn.
- Clearly distinguish contributing factors from certainty.
- Keep the explanation under 120 words.
"""

        try:

            response = groq_client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2,
                max_tokens=200,
                include_reasoning = False
            )

            explanation = response.choices[0].message.content
            if not explanation:
                explanation = (
            "The model generated the prediction and SHAP factors, "
            "but no natural-language explanation was returned."
        )

        except Exception as error:
            explanation = (
        "Prediction generated successfully, "
        "but the AI explanation could not be generated: "
        f"{str(error)}"
    )

        except Exception as error:

            explanation = (
                "Prediction generated successfully, "
                f"but the AI explanation could not be generated: "
                f"{str(error)}"
            )

    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "prediction": prediction_label,

        "churn_probability": round(
            float(probability),
            4
        ),

        "churn_probability_percentage": round(
            float(probability) * 100,
            2
        ),

        "top_factors": top_features,

        "explanation": explanation
    }