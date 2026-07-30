// ---------------------------------------------------------------------
// Mental Health Prediction Dashboard — vanilla JS
// Talks to a FastAPI backend: POST {apiBase}/predict
// ---------------------------------------------------------------------

const FIELD_RULES = {
  Age: { min: 11, max: 100, label: "must be between 11 and 100" },
  Avg_Daily_Usage_Hours: { min: 0.01, max: 24, label: "must be between 0 and 24" },
  Daily_Unlocks: { min: 1, max: 500, label: "must be a positive whole number" },
  Study_Hours: { min: 0.01, max: 24, label: "must be between 0 and 24" },
  Physical_Activity_Hours: { min: 0.01, max: 24, label: "must be between 0 and 24" },
  Sleep_Hours_Per_Night: { min: 0.01, max: 24, label: "must be between 0 and 24" },
};

const DEFAULTS = {
  Age: "20",
  Gender: "Female",
  Country: "India",
  Academic_Level: "Undergraduate",
  Most_Used_Platform: "Instagram",
  Purpose_Of_Use: "Socializing",
  Avg_Daily_Usage_Hours: "4",
  Daily_Unlocks: "60",
  Study_Hours: "3",
  Physical_Activity_Hours: "1",
  Sleep_Hours_Per_Night: "6.5",
  Stress_Level: "Medium",
};

let apiBase = "http://localhost:8000";

// ---- element refs ----
const form = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const darkToggle = document.getElementById("darkToggle");
const apiToggle = document.getElementById("apiToggle");
const apiField = document.getElementById("apiField");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const idleState = document.getElementById("idleState");
const placeholderText = document.getElementById("placeholderText");
const scoreDisplay = document.getElementById("scoreDisplay");
const scoreNumber = document.getElementById("scoreNumber");
const gaugeFill = document.getElementById("gaugeFill");
const gaugeNeedle = document.getElementById("gaugeNeedle");

// ---- helpers ----
function getFormValues() {
  const ids = [
    "Age", "Gender", "Country", "Academic_Level", "Most_Used_Platform",
    "Purpose_Of_Use", "Avg_Daily_Usage_Hours", "Daily_Unlocks", "Study_Hours",
    "Physical_Activity_Hours", "Sleep_Hours_Per_Night", "Stress_Level",
  ];
  const values = {};
  ids.forEach((id) => {
    values[id] = document.getElementById(id).value;
  });
  return values;
}

function validate(values) {
  const errors = {};
  Object.entries(FIELD_RULES).forEach(([key, rule]) => {
    const val = parseFloat(values[key]);
    if (values[key] === "" || Number.isNaN(val)) {
      errors[key] = "Required";
    } else if (val < rule.min || val > rule.max) {
      errors[key] = `Value ${rule.label}`;
    }
  });
  return errors;
}

function clearFieldErrors() {
  Object.keys(FIELD_RULES).forEach((key) => {
    const errEl = document.getElementById(`err-${key}`);
    const inputEl = document.getElementById(key);
    if (errEl) errEl.textContent = "";
    if (inputEl) inputEl.classList.remove("input-invalid");
  });
}

function showFieldErrors(errors) {
  Object.entries(errors).forEach(([key, msg]) => {
    const errEl = document.getElementById(`err-${key}`);
    const inputEl = document.getElementById(key);
    if (errEl) errEl.textContent = msg;
    if (inputEl) inputEl.classList.add("input-invalid");
  });
}

function updateSnapshot(values) {
  document.getElementById("snapSleep").textContent = `${values.Sleep_Hours_Per_Night}h`;
  document.getElementById("snapScreen").textContent = `${values.Avg_Daily_Usage_Hours}h`;
  document.getElementById("snapStress").textContent = values.Stress_Level;
  document.getElementById("snapActivity").textContent = `${values.Physical_Activity_Hours}h`;
}

function setGauge(value, animate) {
  const clamped = Math.max(0, Math.min(10, value ?? 0));
  const angle = -90 + (clamped / 10) * 180;
  const rad = angle * (Math.PI / 180);
  const x2 = 110 + 68 * Math.sin(rad);
  const y2 = 110 - 68 * Math.cos(rad);

  gaugeNeedle.classList.toggle("gauge-needle-animate", !!animate);
  gaugeFill.style.strokeDashoffset = 283 - (283 * clamped) / 10;
  gaugeNeedle.setAttribute("x2", x2);
  gaugeNeedle.setAttribute("y2", y2);
}

function setState(state) {
  // state: "idle" | "loading" | "error" | "result"
  loadingState.classList.toggle("hidden", state !== "loading");
  errorState.classList.toggle("hidden", state !== "error");
  placeholderText.classList.toggle("hidden", state === "result");
  scoreDisplay.classList.toggle("hidden", state !== "result");
}

// ---- event wiring ----
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  darkToggle.textContent = document.body.classList.contains("dark")
    ? "☀ Light mode"
    : "☾ Dark mode";
});

apiToggle.addEventListener("click", () => {
  apiField.classList.toggle("hidden");
  if (!apiField.classList.contains("hidden")) apiField.focus();
});

apiField.value = apiBase;
apiField.addEventListener("input", (e) => {
  apiBase = e.target.value || apiBase;
});

resetBtn.addEventListener("click", () => {
  Object.entries(DEFAULTS).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  clearFieldErrors();
  setState("idle");
  setGauge(null, false);
  updateSnapshot(DEFAULTS);
});

form.addEventListener("input", () => updateSnapshot(getFormValues()));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const values = getFormValues();
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  const payload = {
    Age: parseInt(values.Age, 10),
    Gender: values.Gender,
    Country: values.Country,
    Academic_Level: values.Academic_Level,
    Most_Used_Platform: values.Most_Used_Platform,
    Purpose_Of_Use: values.Purpose_Of_Use,
    Avg_Daily_Usage_Hours: parseFloat(values.Avg_Daily_Usage_Hours),
    Daily_Unlocks: parseInt(values.Daily_Unlocks, 10),
    Study_Hours: parseFloat(values.Study_Hours),
    Physical_Activity_Hours: parseFloat(values.Physical_Activity_Hours),
    Sleep_Hours_Per_Night: parseFloat(values.Sleep_Hours_Per_Night),
    Stress_Level: values.Stress_Level,
  };

  submitBtn.disabled = true;
  setState("loading");

  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`);
    }

    const data = await res.json();
    const score = data.prediction_mental_health_score;

    scoreNumber.textContent = score.toFixed(2);
    setGauge(score, true);
    setState("result");
  } catch (err) {
    const message =
      err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")
        ? `Couldn't reach the API at ${apiBase}. Check the address and that the server is running.`
        : err.message || "Something went wrong while predicting.";
    errorState.textContent = message;
    setState("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- init ----
updateSnapshot(DEFAULTS);
setGauge(null, false);
