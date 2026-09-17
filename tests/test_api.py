from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "healthy"


def test_prediction():

    customer = {
        "gender": "Male",
        "SeniorCitizen": 0,
        "Partner": "No",
        "Dependents": "No",
        "tenure": 5,
        "PhoneService": "Yes",
        "MultipleLines": "No",
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "OnlineBackup": "No",
        "DeviceProtection": "No",
        "TechSupport": "No",
        "StreamingTV": "Yes",
        "StreamingMovies": "Yes",
        "Contract": "Month-to-month",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check",
        "MonthlyCharges": 80.5,
        "TotalCharges": 400.2
    }

    response = client.post(
        "/predict",
        json=customer
    )

    assert response.status_code == 200

    data = response.json()

    assert "prediction" in data
    assert "churn_probability" in data
    assert "top_factors" in data
    assert "explanation" in data

    assert data["prediction"] in [
        "Churn",
        "No Churn"
    ]

    assert 0 <= data["churn_probability"] <= 1