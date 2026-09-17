const form = document.getElementById("predictionForm");

const result = document.getElementById("result");

const probabilityElement =
    document.getElementById("probability");

const predictionElement =
    document.getElementById("prediction");

const factorsList =
    document.getElementById("factorsList");

const explanationText =
    document.getElementById("explanationText");


form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const customer = {

        gender:
            document.getElementById("gender").value,

        SeniorCitizen:
            Number(
                document.getElementById("SeniorCitizen").value
            ),

        Partner:
            document.getElementById("Partner").value,

        Dependents:
            document.getElementById("Dependents").value,

        tenure:
            Number(
                document.getElementById("tenure").value
            ),

        PhoneService:
            document.getElementById("PhoneService").value,

        MultipleLines:
            document.getElementById("MultipleLines").value,

        InternetService:
            document.getElementById("InternetService").value,

        OnlineSecurity:
            document.getElementById("OnlineSecurity").value,

        OnlineBackup:
            document.getElementById("OnlineBackup").value,

        DeviceProtection:
            document.getElementById("DeviceProtection").value,

        TechSupport:
            document.getElementById("TechSupport").value,

        StreamingTV:
            document.getElementById("StreamingTV").value,

        StreamingMovies:
            document.getElementById("StreamingMovies").value,

        Contract:
            document.getElementById("Contract").value,

        PaperlessBilling:
            document.getElementById("PaperlessBilling").value,

        PaymentMethod:
            document.getElementById("PaymentMethod").value,

        MonthlyCharges:
            Number(
                document.getElementById("MonthlyCharges").value
            ),

        TotalCharges:
            Number(
                document.getElementById("TotalCharges").value
            )
    };


    try {

        const response = await fetch(
            "http://127.0.0.1:8000/predict",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(customer)
            }
        );


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );

        }


        const data = await response.json();


        // Show result

        result.classList.remove("hidden");


        probabilityElement.textContent =
            `${data.churn_probability_percentage}%`;


        predictionElement.textContent =
            data.prediction;


        predictionElement.className =
            "prediction " +
            (
                data.prediction === "Churn"
                    ? "danger"
                    : "safe"
            );


        // Factors

        factorsList.innerHTML = "";


        data.top_factors.forEach((factor) => {

            const div =
                document.createElement("div");

            div.className = "factor";


            div.innerHTML = `
                <span>${factor.feature}</span>
                <span>
                    ${factor.impact}
                </span>
            `;


            factorsList.appendChild(div);

        });


        // Groq explanation

        explanationText.textContent =
            data.explanation;


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the FastAPI server."
        );

    }

});