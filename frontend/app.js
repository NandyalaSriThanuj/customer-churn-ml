/**
 * ChurnAI - Enterprise Customer Retention & Prediction Frontend Controller
 * Integrates with FastAPI backend: POST http://127.0.0.1:8000/predict
 */

// API Configuration (Supports Vercel / Vite env variables or window.VITE_API_URL, fallback to localhost)
const getApiBaseUrl = () => {
    try {
        if (typeof window !== "undefined") {
            if (window.VITE_API_URL) return window.VITE_API_URL;
            if (window.__ENV__ && window.__ENV__.VITE_API_URL) return window.__ENV__.VITE_API_URL;
            const stored = localStorage.getItem("VITE_API_URL");
            if (stored) return stored;
        }
        if (typeof process !== "undefined" && process.env && process.env.VITE_API_URL) {
            return process.env.VITE_API_URL;
        }
    } catch (e) {
        // Fallback
    }
    return "http://127.0.0.1:8000";
};

const API_BASE_URL = getApiBaseUrl();
const PREDICT_ENDPOINT = `${API_BASE_URL}/predict`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/`;

// DOM Elements - Form & Controls
const form = document.getElementById("predictionForm");
const btnSubmit = document.getElementById("btnSubmit");
const btnIcon = document.getElementById("btnIcon");
const btnText = document.getElementById("btnText");
const btnClearForm = document.getElementById("btnClearForm");

// Tenure controls
const tenureInput = document.getElementById("tenure");
const tenureSlider = document.getElementById("tenureSlider");
const tenureLabel = document.getElementById("tenureLabel");

// API Status Elements
const apiStatusBadge = document.getElementById("apiStatusBadge");
const apiStatusDot = document.getElementById("apiStatusDot");
const apiStatusText = document.getElementById("apiStatusText");

// Presets
const presetHighRisk = document.getElementById("presetHighRisk");
const presetLoyal = document.getElementById("presetLoyal");
const presetDefault = document.getElementById("presetDefault");

// DOM Elements - Results Dashboard
const resultSection = document.getElementById("result");
const probabilityElement = document.getElementById("probability");
const gaugeFill = document.getElementById("gaugeFill");
const riskLevelText = document.getElementById("riskLevelText");
const predictionElement = document.getElementById("prediction");
const statusDetails = document.getElementById("statusDetails");
const factorsList = document.getElementById("factorsList");
const explanationText = document.getElementById("explanationText");
const resultTimestamp = document.getElementById("resultTimestamp");
const toastContainer = document.getElementById("toastContainer");

// SVG Gauge Circumference for r=70: 2 * Math.PI * 70 = ~439.82
const GAUGE_CIRCUMFERENCE = 440;

// ============================================================================
// Initialization & Event Listeners
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    initTenureSync();
    initPresets();
    checkApiHealth();
    // Re-check API health periodically
    setInterval(checkApiHealth, 25000);
});

/**
 * Synchronize slider and number input for tenure
 */
function initTenureSync() {
    function updateTenure(val) {
        val = Math.max(0, Math.min(72, Number(val) || 0));
        tenureInput.value = val;
        tenureSlider.value = val;
        tenureLabel.textContent = `${val} Month${val === 1 ? '' : 's'}`;
    }

    tenureSlider.addEventListener("input", (e) => updateTenure(e.target.value));
    tenureInput.addEventListener("input", (e) => updateTenure(e.target.value));
    updateTenure(tenureInput.value);
}

/**
 * Check FastAPI backend health
 */
async function checkApiHealth() {
    try {
        const response = await fetch(HEALTH_ENDPOINT, { method: "GET" });
        if (response.ok) {
            apiStatusDot.className = "status-indicator online";
            apiStatusText.textContent = "FastAPI Connected";
            apiStatusBadge.title = "Backend is online and ready";
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (err) {
        apiStatusDot.className = "status-indicator offline";
        apiStatusText.textContent = "Backend Offline (8000)";
        apiStatusBadge.title = "Ensure FastAPI backend is running on http://127.0.0.1:8000";
    }
}

/**
 * Preset data configurations
 */
const PRESETS = {
    highRisk: {
        gender: "Female",
        SeniorCitizen: 0,
        Partner: "No",
        Dependents: "No",
        tenure: 2,
        PhoneService: "Yes",
        MultipleLines: "No",
        InternetService: "Fiber optic",
        OnlineSecurity: "No",
        OnlineBackup: "No",
        DeviceProtection: "No",
        TechSupport: "No",
        StreamingTV: "Yes",
        StreamingMovies: "Yes",
        Contract: "Month-to-month",
        PaperlessBilling: "Yes",
        PaymentMethod: "Electronic check",
        MonthlyCharges: 95.80,
        TotalCharges: 191.60
    },
    loyal: {
        gender: "Male",
        SeniorCitizen: 0,
        Partner: "Yes",
        Dependents: "Yes",
        tenure: 62,
        PhoneService: "Yes",
        MultipleLines: "Yes",
        InternetService: "DSL",
        OnlineSecurity: "Yes",
        OnlineBackup: "Yes",
        DeviceProtection: "Yes",
        TechSupport: "Yes",
        StreamingTV: "Yes",
        StreamingMovies: "Yes",
        Contract: "Two year",
        PaperlessBilling: "No",
        PaymentMethod: "Bank transfer (automatic)",
        MonthlyCharges: 74.50,
        TotalCharges: 4619.00
    },
    default: {
        gender: "Female",
        SeniorCitizen: 0,
        Partner: "No",
        Dependents: "No",
        tenure: 5,
        PhoneService: "Yes",
        MultipleLines: "No",
        InternetService: "Fiber optic",
        OnlineSecurity: "No",
        OnlineBackup: "No",
        DeviceProtection: "No",
        TechSupport: "No",
        StreamingTV: "Yes",
        StreamingMovies: "Yes",
        Contract: "Month-to-month",
        PaperlessBilling: "Yes",
        PaymentMethod: "Electronic check",
        MonthlyCharges: 80.50,
        TotalCharges: 400.20
    }
};

/**
 * Populate form with a given preset
 */
function applyPreset(data) {
    Object.keys(data).forEach((key) => {
        const el = document.getElementById(key);
        if (el) {
            el.value = data[key];
        }
    });

    if (data.tenure !== undefined) {
        tenureSlider.value = data.tenure;
        tenureLabel.textContent = `${data.tenure} Month${data.tenure === 1 ? '' : 's'}`;
    }
}

function initPresets() {
    if (presetHighRisk) presetHighRisk.addEventListener("click", () => applyPreset(PRESETS.highRisk));
    if (presetLoyal) presetLoyal.addEventListener("click", () => applyPreset(PRESETS.loyal));
    if (presetDefault) presetDefault.addEventListener("click", () => applyPreset(PRESETS.default));
    if (btnClearForm) btnClearForm.addEventListener("click", () => applyPreset(PRESETS.default));
}

// ============================================================================
// Form Submission & API Request
// ============================================================================

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Construct the payload strictly matching CustomerData Pydantic schema
    const customer = {
        gender: document.getElementById("gender").value,
        SeniorCitizen: Number(document.getElementById("SeniorCitizen").value),
        Partner: document.getElementById("Partner").value,
        Dependents: document.getElementById("Dependents").value,
        tenure: Number(document.getElementById("tenure").value),
        PhoneService: document.getElementById("PhoneService").value,
        MultipleLines: document.getElementById("MultipleLines").value,
        InternetService: document.getElementById("InternetService").value,
        OnlineSecurity: document.getElementById("OnlineSecurity").value,
        OnlineBackup: document.getElementById("OnlineBackup").value,
        DeviceProtection: document.getElementById("DeviceProtection").value,
        TechSupport: document.getElementById("TechSupport").value,
        StreamingTV: document.getElementById("StreamingTV").value,
        StreamingMovies: document.getElementById("StreamingMovies").value,
        Contract: document.getElementById("Contract").value,
        PaperlessBilling: document.getElementById("PaperlessBilling").value,
        PaymentMethod: document.getElementById("PaymentMethod").value,
        MonthlyCharges: Number(document.getElementById("MonthlyCharges").value),
        TotalCharges: Number(document.getElementById("TotalCharges").value)
    };

    setLoadingState(true);

    try {
        const response = await fetch(PREDICT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customer)
        });

        if (!response.ok) {
            throw new Error(`FastAPI responded with HTTP status ${response.status}`);
        }

        const data = await response.json();

        // Update UI with real response data
        renderPredictionResults(data);

    } catch (error) {
        console.error("Prediction Request Failed:", error);
        showToast(
            "Prediction Failed",
            `Could not reach the FastAPI server at ${PREDICT_ENDPOINT}. Please ensure your backend is running with 'uvicorn api.main:app --reload'.`,
            "error"
        );
    } finally {
        setLoadingState(false);
    }
});

/**
 * Toggle loading state on the submit button
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        btnSubmit.disabled = true;
        btnIcon.innerHTML = `<span class="spinner"></span>`;
        btnText.textContent = "Analyzing Customer Profile...";
    } else {
        btnSubmit.disabled = false;
        btnIcon.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
        `;
        btnText.textContent = "Run Churn Prediction";
    }
}

/**
 * Render complete prediction results returned by the backend
 */
function renderPredictionResults(data) {
    // Reveal result container with animation
    resultSection.classList.remove("hidden");
    resultSection.classList.add("fade-in");

    // Update timestamp
    const now = new Date();
    resultTimestamp.textContent = `Analyzed at ${now.toLocaleTimeString()}`;

    const probability = Number(data.churn_probability_percentage) || 0;
    const isChurn = data.prediction === "Churn";

    // 1. Animate Probability Number
    animateCounter(probabilityElement, 0, probability, 800, "%");

    // 2. Animate Circular Gauge
    // Offset formula: circumference * (1 - prob / 100)
    const targetOffset = GAUGE_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, probability)) / 100);
    gaugeFill.style.strokeDasharray = `${GAUGE_CIRCUMFERENCE}`;
    gaugeFill.style.strokeDashoffset = `${targetOffset}`;

    // Color code gauge & status
    if (probability >= 60) {
        gaugeFill.style.stroke = "var(--danger)";
        riskLevelText.textContent = "⚠️ High Risk Tier (>60%)";
        riskLevelText.style.color = "var(--danger)";
    } else if (probability >= 35) {
        gaugeFill.style.stroke = "var(--warning)";
        riskLevelText.textContent = "⚡ Moderate Risk Tier (35-60%)";
        riskLevelText.style.color = "var(--warning)";
    } else {
        gaugeFill.style.stroke = "var(--success)";
        riskLevelText.textContent = "🛡️ Low Risk Tier (<35%)";
        riskLevelText.style.color = "var(--success)";
    }

    // 3. Binary Classification Pill
    predictionElement.textContent = data.prediction;
    if (isChurn) {
        predictionElement.className = "prediction-pill danger";
        statusDetails.className = "status-details danger-border";
        statusDetails.innerHTML = `
            <strong>High Churn Risk:</strong> The model projects this customer has a elevated likelihood of canceling service. 
            Prioritize proactive retention offers based on the key risk drivers below.
        `;
    } else {
        predictionElement.className = "prediction-pill safe";
        statusDetails.className = "status-details safe-border";
        statusDetails.innerHTML = `
            <strong>Healthy Retention:</strong> The model projects low churn propensity. 
            Account characteristics indicate positive customer loyalty and stability.
        `;
    }

    // 4. Render SHAP Factors
    renderShapFactors(data.top_factors || []);

    // 5. Render AI Explanation
    explanationText.textContent = data.explanation || "No automated explanation available.";

    // Smooth scroll into results
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Format raw feature names into clean, readable titles
 */
function formatFeatureName(rawName) {
    if (!rawName) return "Unknown Feature";
    
    // Clean scikit-learn OneHotEncoder / ColumnTransformer prefixes
    let cleaned = rawName.replace(/^(numerical__|categorical__|cat__|num__|remainder__)/i, "");
    
    // Convert feature_category syntax like "InternetService_Fiber optic" to "Internet Service: Fiber optic"
    if (cleaned.includes("_")) {
        const parts = cleaned.split("_");
        if (parts.length === 2 && parts[1].length > 0) {
            return `${parts[0]}: ${parts[1]}`;
        }
    }
    
    // Replace remaining underscores with spaces
    cleaned = cleaned.replace(/_/g, " ");
    
    return cleaned;
}

/**
 * Render SHAP factor cards with impact polarity and visual magnitude bars
 */
function renderShapFactors(factors) {
    factorsList.innerHTML = "";

    if (!factors || factors.length === 0) {
        factorsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No SHAP attribution data available.</p>`;
        return;
    }

    // Determine max absolute SHAP value for scaling bars
    const maxAbsShap = Math.max(...factors.map(f => Math.abs(f.shap_value || 0)), 0.001);

    factors.forEach((factor) => {
        const isRiskIncrease = factor.shap_value > 0;
        const absVal = Math.abs(factor.shap_value || 0);
        const percentage = Math.min(100, Math.max(8, (absVal / maxAbsShap) * 100));

        const card = document.createElement("div");
        card.className = "factor-card";

        const badgeClass = isRiskIncrease ? "danger" : "safe";
        const barClass = isRiskIncrease ? "danger" : "safe";
        const impactLabel = isRiskIncrease ? "+ Risk Factor" : "- Safeguard";

        const formattedName = formatFeatureName(factor.feature);

        card.innerHTML = `
            <div class="factor-header">
                <span class="factor-name" title="${factor.feature}">${formattedName}</span>
                <span class="factor-impact-badge ${badgeClass}">${impactLabel}</span>
            </div>
            <div class="factor-bar-wrapper">
                <div class="factor-bar-fill ${barClass}" style="width: ${percentage}%"></div>
            </div>
            <div class="factor-footer">
                <span>Impact: ${factor.impact}</span>
                <span class="factor-value">SHAP: ${factor.shap_value > 0 ? '+' : ''}${factor.shap_value.toFixed(4)}</span>
            </div>
        `;

        factorsList.appendChild(card);
    });
}

/**
 * Animated number counter
 */
function animateCounter(element, start, end, duration, suffix = "") {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Ease out quadratic
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        const current = (start + (end - start) * easeProgress).toFixed(2);
        element.textContent = `${current}${suffix}`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = `${end.toFixed(2)}${suffix}`;
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Toast notification helper
 */
function showToast(title, message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}