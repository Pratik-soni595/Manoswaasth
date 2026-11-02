# Manoswaasth – Dincharya Suitability Scoring Engine: Walkthrough Guide

This document provides a comprehensive technical walkthrough of the **Independent Suitability Scoring Engine** developed for the **Manoswaasth Personalised Dincharya Recommendation System**.

---

## 1. System Overview & Architecture

The Manoswaasth Dincharya feature recommends four daily micro-rituals or activities aligned with a user's Ayurvedic constitution (**Prakriti**) and their daily work and sleep schedules.

In accordance with **Approach B (Suitability Scoring followed by ML-based Selection)**, this system decouples domain-based suitability scoring from the future Machine Learning selection model:

```
+-------------------------------------------------------+
|                      User Input                       |
|   - Primary Prakriti (e.g. Vata-Pitta)                |
|   - Work Schedule (Break Start, Break End, Home Time) |
|   - Sleep Schedule (Sleep Time, Wake Time)            |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                 Preprocessing Module                  |
|   - Canonical Prakriti Normalisation                  |
|   - 24-Hour Time Parsing & Schedule Validation        |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|             Feature Engineering Module                |
|   - Break Duration (minutes)                          |
|   - Sleep Duration (accounting for midnight crossing) |
|   - Available Evening Time (Home to Bedtime)          |
|   - Category Available Time Mapping                   |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|            Suitability Scoring Engine                 |
|   1. Time Eligibility Filter (exceeding tasks pruned) |
|   2. Dosha Suitability Score (0-100)                  |
|   3. Context Suitability Score (0-100, capped budget) |
|   4. Final Weighted Score: (0.70 * D) + (0.30 * C)    |
|   5. Deterministic Tie-Breaking (task_id ASC)         |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                 Ranked Eligible Tasks                 |
|   (Ready for downstream Random Forest selection / API)|
+-------------------------------------------------------+
```

---

## 2. Directory & Module Structure

The scoring engine is completely self-contained in `manoswaasth-ml/`:

```
manoswaasth-ml/
├── data/
│   ├── task_catalogue.json            # 35-task master catalogue (source of truth)
│   └── dincharya_synthetic_dataset.csv # 1,000 synthetic labeled training rows
├── models/
│   ├── dincharya_models.joblib        # Serialized Random Forest bundle + transformer
│   └── metrics.json                   # Comprehensive test metrics & confusion matrices
├── src/
│   ├── __init__.py                    # Package initializer
│   ├── catalogue_loader.py           # JSON loader & domain integrity validator
│   ├── preprocessing.py              # String normalisation & 24-hr time parsing
│   ├── feature_engineering.py        # Schedule derivations & midnight calculations
│   ├── suitability_engine.py         # Dosha, Context, 70:30 final score & ranking
│   ├── dataset_generator.py          # Synthetic CSV rows labeled by the scoring engine
│   ├── model_pipeline.py             # Feature encoding, model training, evaluation & inference
│   └── train.py                      # CLI training & evaluation entry point
├── tests/
│   ├── __init__.py                   # Test package initializer
│   ├── test_catalogue_validation.py  # 35 tasks, schema, positive durations, bounds
│   ├── test_dosha_scoring.py         # 7 Prakriti profiles, order invariance, bounds
│   ├── test_time_filtering.py        # Midnight crossing, exact fits, invalid times
│   ├── test_suitability_engine.py    # Weighted formula, budget caps, tie-breakers
│   ├── test_dataset_generator.py     # Deterministic dataset generation & constraints
│   └── test_model_pipeline.py        # Training pipeline, validation, leakage & metrics
├── main.py                           # CLI interactive demo & worked examples
├── requirements.txt                  # Dependencies (pytest, scikit-learn, joblib, numpy, scipy)
└── WALKTHROUGH.md                    # This walkthrough documentation
```

---

## 3. Deep Dive into Core Modules

### 3.1 Catalogue Loader (`src/catalogue_loader.py`)
Loads and validates the 35-activity JSON catalogue without altering source data.
* **Integrity Checks:**
  * Ensures root structure is a dictionary with a `tasks` list.
  * Verifies exactly **35 activities** are present.
  * Ensures all `task_id` values are unique.
  * Enforces the 4 categories: `work_break` (8), `after_work` (9), `before_bed` (9), `after_waking` (9).
  * Validates every task contains `dosha_affinity` with `vata`, `pitta`, and `kapha` values in `[1, 2, 3]`.
  * Verifies `duration_minutes > 0`.
  * Confirms informational metadata like `safety_restrictions` is present on each task.

### 3.2 Preprocessing (`src/preprocessing.py`)
* **`normalize_prakriti(prakriti)`**: Converts any case, spacing, or permutation (e.g., `"Pitta-Vata"`, `"pitta_vata"`, `"VATA"`) into canonical hyphenated profiles:
  * Single: `vata`, `pitta`, `kapha`
  * Dual: `vata-pitta`, `vata-kapha`, `pitta-kapha`
  * Triple: `vata-pitta-kapha`
* **`normalize_category(category)`**: Maps aliases like `"During Work Break"`, `"after work"`, `"morning"` to canonical category keys (`work_break`, `after_work`, `before_bed`, `after_waking`).
* **`parse_time_string(time_str)`**: Parses `HH:MM` 24-hour time strings (`00:00` to `23:59`) into Python `datetime.time` objects.
* **`validate_user_schedule(schedule)`**: Validates presence of `break_start`, `break_end`, `return_home_time`, `sleep_time`, and `wake_time`.

### 3.3 Feature Engineering (`src/feature_engineering.py`)
Computes derived durations in minutes:
* **`break_duration`**: $T_{\text{break\_end}} - T_{\text{break\_start}}$. Must be positive; daytime work breaks cannot cross midnight.
* **`sleep_duration`**: $T_{\text{wake}} - T_{\text{sleep}}$. Automatically handles midnight crossing:
  $$\text{Minutes} = (1440 - T_{\text{sleep}}) + T_{\text{wake}}$$
  *(e.g., 23:00 to 07:00 yields $60 + 420 = 480\text{ minutes}$)*.
* **`available_after_work`**: $T_{\text{sleep}} - T_{\text{return\_home}}$. Handles same-day and midnight-crossing evening hours *(e.g., 18:30 to 23:00 yields $270\text{ minutes}$)*.
* **`calculate_available_time(schedule, category)`**:
  * `work_break`: Returns `break_duration`.
  * `after_work`: Returns `available_after_work`.
  * `before_bed`: Configurable bedtime routine budget (default: $15\text{ min}$).
  * `after_waking`: Configurable morning routine budget (default: $15\text{ min}$).

### 3.4 Suitability Scoring Engine (`src/suitability_engine.py`)

#### A. Dosha Suitability Score
Calculates affinity compatibility on a $0 - 100$ scale:
* **Single Dosha:** $\text{Dosha Score} = \left(\frac{\text{Affinity}}{3}\right) \times 100$
* **Dual Dosha:** $\text{Dosha Score} = \left(\frac{\text{Affinity}_1 + \text{Affinity}_2}{2 \times 3}\right) \times 100$
* **Triple Dosha:** $\text{Dosha Score} = \left(\frac{\text{Affinity}_1 + \text{Affinity}_2 + \text{Affinity}_3}{3 \times 3}\right) \times 100$

#### B. Context Suitability Score
Assesses time fit within the available slot budget:
$$\text{Context Score} = \left(\frac{\text{Activity Duration}}{\text{Available Slot Budget}}\right) \times 100$$
To prevent excessively long evening or break times from distorting the score, the slot budget is capped by the category's maximum recommended duration:
$$\text{Available Slot Budget} = \min(\text{Available Minutes}, \text{Category Budget Cap})$$

Initial category budget caps:
| Category | Maximum Slot Budget |
| :--- | :--- |
| `work_break` | 5 minutes |
| `after_work` | 15 minutes |
| `before_bed` | 15 minutes |
| `after_waking` | 15 minutes |

*Activities whose duration exceeds the available time are strictly excluded before scoring.*

#### C. Final Weighted Suitability Score
$$\text{Final Score} = (0.70 \times \text{Dosha Score}) + (0.30 \times \text{Context Score})$$
Bounded between $0.00$ and $100.00$, rounded to two decimal places.

#### D. Deterministic Ranking & Tie-Breaking
Activities are sorted by:
1. `final_score` (Descending)
2. `task_id` (Ascending / Alphabetical) — *eliminates randomness when two tasks tie*.

---

## 4. Worked Calculation Example

Consider a user with:
* **Prakriti:** `Vata-Pitta`
* **Task:** `BR01` (Mindful Breathing, duration: 3 minutes)
  * Affinity: $\text{Vata} = 3, \text{Pitta} = 3, \text{Kapha} = 2$
* **Slot:** `work_break`, available break duration $= 3\text{ minutes}$.

### Step 1: Dosha Score
$$\text{Mean Affinity} = \frac{\text{Vata} + \text{Pitta}}{2} = \frac{3 + 3}{2} = 3.0$$
$$\text{Dosha Score} = \left(\frac{3.0}{3.0}\right) \times 100 = \mathbf{100.00}$$

### Step 2: Context Score
$$\text{Slot Budget} = \min(3, 5) = 3\text{ minutes}$$
$$\text{Context Score} = \left(\frac{3}{3}\right) \times 100 = \mathbf{100.00}$$

### Step 3: Final Suitability Score
$$\text{Final Score} = (0.70 \times 100.00) + (0.30 \times 100.00) = \mathbf{100.00}$$

Now consider `BR02` (Gentle Neck and Shoulder Stretches, duration: 3 minutes):
* Affinity: $\text{Vata} = 3, \text{Pitta} = 2, \text{Kapha} = 2$
* $\text{Dosha Score} = \left(\frac{3 + 2}{2 \times 3}\right) \times 100 = 83.33$
* $\text{Context Score} = \left(\frac{3}{3}\right) \times 100 = 100.00$
* $\text{Final Score} = (0.70 \times 83.33) + (0.30 \times 100.00) = 58.331 + 30.000 = \mathbf{88.33}$

`BR01` ($100.00$) correctly ranks above `BR02` ($88.33$).

---

## 5. Running the Engine and Tests

### 5.1 Execute Unit Tests
To execute all 32 automated tests:

```powershell
python -m unittest discover -s manoswaasth-ml/tests -p "test_*.py" -v
```

All 32 test cases pass in under 0.05 seconds with zero external dependencies.

### 5.2 Run the Demonstration Script
To see live evaluations across `Vata`, `Pitta-Kapha`, and `Vata-Pitta-Kapha` profiles:

```powershell
python manoswaasth-ml/main.py
```

---

## 6. Next Steps (Future Phase)

With Phase 1 (synthetic dataset generation) and Phase 2 (machine learning training and evaluation) complete, the project is ready for:
1. **Inference Service (Phase 3):** Package the trained model bundle and suitability scoring engine into a lightweight Python FastAPI service with strict schema validation.
2. **Backend Integration:** Connect the existing Node.js/Express backend to the Python inference API via internal HTTP calls.
3. **Frontend Integration:** Display the 4 recommended daily tasks with precautions and Ayurvedic rationale on the React UI.

---

## 7. Phase 1: Synthetic Labeled Dataset

`src/dataset_generator.py` creates a reproducible CSV using the existing preprocessing,
feature engineering, catalogue, and suitability ranking modules. It does not change the
scoring formula or train a model. The default output is
`manoswaasth-ml/data/dincharya_synthetic_dataset.csv`.

Run from the repository root:

```powershell
python manoswaasth-ml/src/dataset_generator.py --rows 1000 --seed 42 --output manoswaasth-ml/data/dincharya_synthetic_dataset.csv
```

---

## 8. Phase 2: Machine Learning Model Training and Evaluation

Phase 2 introduces a reproducible training pipeline under `src/model_pipeline.py` and a command-line interface under `src/train.py`.

### 8.1 Installing Dependencies
Install all required packages from `manoswaasth-ml/requirements.txt`:

```powershell
python -m pip install -r manoswaasth-ml/requirements.txt
```

Versions used:
* **Python:** 3.13.5
* **scikit-learn:** 1.9.1 (compatible with `>=1.4.0`)
* **joblib:** 1.6.0 (compatible with `>=1.3.0`)
* **numpy:** 2.5.4 (compatible with `>=1.24.0`)
* **scipy:** 1.18.1 (compatible with `>=1.10.0`)
* **pytest:** 9.2.0 (compatible with `>=8.0.0`)

### 8.2 Running the Training CLI
Run the training pipeline from the repository root:

```powershell
python manoswaasth-ml/src/train.py --data manoswaasth-ml/data/dincharya_synthetic_dataset.csv --output-dir manoswaasth-ml/models --seed 42 --test-size 0.2
```

CLI Arguments:
* `--data`: Path to input dataset CSV (default: `manoswaasth-ml/data/dincharya_synthetic_dataset.csv`).
* `--output-dir`: Output directory for serialized models and metrics (default: `manoswaasth-ml/models`).
* `--seed`: Deterministic random seed for data splitting and model training (default: `42`).
* `--test-size`: Fraction of data reserved for held-out evaluation (default: `0.2`, i.e., 20%).

### 8.3 Feature Preprocessing & Zero Leakage
The `DincharyaFeatureTransformer` converts raw user inputs into a 20-dimensional numerical feature vector:

1. **Categorical Dosha Profiles (7 features):** One-hot encoding across the seven canonical Prakriti profiles (`vata`, `pitta`, `kapha`, `vata-pitta`, `vata-kapha`, `pitta-kapha`, `vata-pitta-kapha`). Handles permutations and casing (e.g., `Pitta-Vata` $\equiv$ `vata-pitta`).
2. **Cyclic Time Features (10 features):** The five 24-hour time strings (`break_start`, `break_end`, `return_home_time`, `sleep_time`, `wake_time`) are mapped to continuous circular coordinates on the 1,440-minute daily clock:
   $$\text{sin\_feat} = \sin\left(\frac{2\pi \times \text{minutes}}{1440}\right), \quad \text{cos\_feat} = \cos\left(\frac{2\pi \times \text{minutes}}{1440}\right)$$
   This ensures adjacent times like `23:55` and `00:05` are geometrically close in feature space.
3. **Derived Durations (3 features):** `break_duration`, `sleep_duration`, and `available_after_work` (continuous minutes).
4. **Leakage Protection:** Target task IDs (`label_*`) and row identifiers are strictly excluded from the feature space.

### 8.4 Model Architecture & Stratified Split
* **Architecture:** One independent `RandomForestClassifier` per category (`work_break`, `after_work`, `before_bed`, `after_waking`) trained with `n_estimators=100`, `max_depth=12`, and `random_state=seed`.
* **Split:** 80% train (800 rows), 20% test (200 rows). Uses stratified sampling by `primary_dosha` so all seven profiles are equally represented across training and test subsets. If an input dataset is too small to stratify, the pipeline logs the condition and falls back to a randomized split.

### 8.5 Evaluation Metrics & Baseline Comparison
Models are evaluated on the held-out 20% test set (200 rows) against a `DummyClassifier(strategy="most_frequent")` baseline:

| Category | RF Accuracy | RF Macro-F1 | RF Weighted-F1 | Baseline Accuracy | Classes in Test Set |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `work_break` | **1.0000** | **1.0000** | **1.0000** | 0.5250 | `BR01` (105), `BR05` (87), `BR08` (8) |
| `after_work` | **1.0000** | **1.0000** | **1.0000** | 0.2850 | `HM04` (57), `HM03` (57), `HM09` (57), `HM01` (29) |
| `before_bed` | **1.0000** | **1.0000** | **1.0000** | 1.0000 | `SL02` (200) |
| `after_waking` | **1.0000** | **1.0000** | **1.0000** | 0.5700 | `WK04` (114), `WK05` (57), `WK03` (29) |

### 8.6 Saved Artifacts
The training command outputs two files:
1. `models/dincharya_models.joblib`: Complete serialized bundle containing the fitted `DincharyaFeatureTransformer`, the 4 category `RandomForestClassifier` models, the baseline classifiers, feature names, and environment metadata.
2. `models/metrics.json`: Machine-readable evaluation report containing per-category accuracy, macro-F1, weighted-F1, class counts, and full confusion matrices.

### 8.7 Limitations of Heuristic Labels
> [!IMPORTANT]
> **Agreement with Heuristic Labels Only:** The perfect test scores (1.0000 accuracy) reflect the Random Forest model's ability to learn the deterministic mathematical rules and tie-breaking logic of the Suitability Scoring Engine on synthetic inputs. These metrics demonstrate high **heuristic fidelity**, but do **not** indicate real-world user adoption, behavioural adherence, or clinical efficacy.
>
> Furthermore, in the synthetic dataset, `label_before_bed` contains only a single class (`SL02`) because `SL02` has the maximum 15-minute duration and top dosha affinity, consistently winning the heuristic tie-breaker under a default 15-minute bedtime budget. In real-world deployment, contextual variation, user feedback, and exploration policies will be needed to recommend diverse bedtime rituals.

---

## 9. Phase 3: FastAPI Inference Microservice

Phase 3 operationalizes the Phase 2 trained Random Forest models as an independent, lightweight HTTP inference service using **FastAPI** and **Uvicorn**.

### 9.1 Environment & Installed Dependencies
The microservice relies on modern, production-grade Python asynchronous components:
* **FastAPI:** 0.162.0 (compatible with `>=0.110.0`)
* **Uvicorn:** 0.54.0 (compatible with `>=0.28.0`)
* **Pydantic:** 2.14.2 (compatible with `>=2.9.0`)
* **HTTPX / HTTPX2:** 0.28.1 / 2.16.0 (compatible with `>=0.27.0`)
* **scikit-learn:** 1.9.1 (compatible with `>=1.4.0`)
* **joblib:** 1.6.0 (compatible with `>=1.3.0`)

To install all dependencies:
```powershell
python -m pip install -r manoswaasth-ml/requirements.txt
```

### 9.2 Running the Inference Service
Start the service from the repository root:
```powershell
python manoswaasth-ml/src/serve.py --host 127.0.0.1 --port 8000
```

CLI Options:
* `--host`: Host to bind (default: `127.0.0.1` or `DINCHARYA_HOST` env var).
* `--port`: Port to bind (default: `8000` or `DINCHARYA_PORT` env var).
* `--model`: Path to model bundle (default: `manoswaasth-ml/models/dincharya_models.joblib` or `DINCHARYA_MODEL_PATH` env var).
* `--catalogue`: Path to task catalogue (default: `manoswaasth-ml/data/task_catalogue.json` or `DINCHARYA_CATALOGUE_PATH` env var).
* `--reload`: Enable live code reloading for development.

### 9.3 Environment Variable Configuration
Create a `.env` file from `.env.example` to customize deployment settings without CLI flags:
```env
DINCHARYA_HOST=127.0.0.1
DINCHARYA_PORT=8000
DINCHARYA_MODEL_PATH=models/dincharya_models.joblib
DINCHARYA_CATALOGUE_PATH=data/task_catalogue.json
```

### 9.4 API Endpoints & Contract Specifications

#### A. Health Check (`GET /health`)
Used by load balancers, orchestrators, and the Node.js backend to verify service readiness.
* **URL:** `http://127.0.0.1:8000/health`
* **Response (HTTP 200):**
```json
{
  "status": "ok",
  "service": "dincharya-recommendation-api",
  "model_loaded": true
}
```
* **Security & Readiness:** Reports `model_loaded: true` only when all 4 category models and all 35 catalogue tasks are initialized. The response deliberately avoids exposing internal filesystem paths, hostnames, or credentials.

#### B. Generate Recommendations (`POST /recommend`)
Accepts user Prakriti and daily schedule, validates input, applies feature engineering and ML inference, enriches with task metadata, and returns recommendations for all 4 categories.

* **URL:** `http://127.0.0.1:8000/recommend`
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "primary_dosha": "vata-pitta",
  "break_start": "13:00",
  "break_end": "13:10",
  "return_home_time": "18:30",
  "sleep_time": "23:00",
  "wake_time": "06:30"
}
```

* **Response (HTTP 200):**
```json
{
  "recommendations": {
    "work_break": {
      "task_id": "BR01",
      "title": "Mindful Breathing & Pranayama",
      "description": "5 minutes of slow Nadi Shodhana breathing to settle mental agitation and balance nervous energy.",
      "duration_minutes": 5,
      "safety_restrictions": [],
      "ayurvedic_principle": "Calms aggravated Prana Vata and clears mental fatigue."
    },
    "after_work": {
      "task_id": "HM04",
      "title": "Herbal Evening Transition Tea",
      "description": "Warm infusion of chamomile, brahmi, or tulsi to mark the transition from work to home.",
      "duration_minutes": 10,
      "safety_restrictions": [],
      "ayurvedic_principle": "Grounds active Rajas and encourages sensory withdrawal (Pratyahara)."
    },
    "before_bed": {
      "task_id": "SL02",
      "title": "Pada Abhyanga (Warm Foot Massage)",
      "description": "Massaging soles of feet with warm sesame oil before sleep to draw energy downwards and promote deep rest.",
      "duration_minutes": 15,
      "safety_restrictions": [
        "Avoid during acute fever or indigestion"
      ],
      "ayurvedic_principle": "Stimulates Padabhyanga marma points, pacifies Apana and Vyana Vata."
    },
    "after_waking": {
      "task_id": "WK04",
      "title": "Warm Lemon & Honey Water (Ushapan)",
      "description": "Drinking 1-2 glasses of warm water to stimulate peristalsis and flush metabolic toxins (Ama).",
      "duration_minutes": 5,
      "safety_restrictions": [
        "Never add honey to boiling hot water (creates Ama according to Charaka Samhita)"
      ],
      "ayurvedic_principle": "Kindles Jatharagni gently and supports natural colon evacuation."
    }
  },
  "model": {
    "name": "RandomForestClassifier",
    "version": "1.0",
    "scikit_learn_version": "1.9.1",
    "note": "Predictions reflect agreement with the rule-based suitability scoring heuristic. These are non-medical lifestyle recommendations and are not clinically validated."
  }
}
```

### 9.5 Validation & Error Handling
The microservice implements robust input validation and returns standardized error structures with HTTP status codes:

1. **Unsupported Prakriti:** Returns `HTTP 422 Unprocessable Content`:
   ```json
   {
     "ok": false,
     "error": "Invalid primary_dosha: 'invalid-dosha' is not a supported Prakriti profile..."
   }
   ```
2. **Invalid Schedule Ordering:** If work break ends before or at its start time:
   ```json
   {
     "ok": false,
     "error": "Invalid schedule input: End time (13:00) is earlier than start time (13:30)..."
   }
   ```
3. **Extra Field Injection:** Extra attributes (such as `label_work_break`) are forbidden via Pydantic `extra="forbid"`:
   ```json
   {
     "ok": false,
     "error": "Validation error: body.label_work_break: Extra inputs are not permitted",
     "details": [...]
   }
   ```
4. **Catalogue Verification:** Each predicted task ID is checked against the loaded task catalogue. If a task is missing or assigned to an incorrect category, the service aborts with `HTTP 500 Internal Server Error` and logs the issue without returning corrupted output.

### 9.6 Security & Artifact Handling
> [!CAUTION]
> **Joblib Model Serialization Security:**
> Model bundles are serialized using `joblib` / `pickle`. In production environments, only load artifact files generated by trusted pipelines inside secure build environments. Never load untrusted model files downloaded over untrusted networks.
>
> If the model bundle is missing or needs retraining, run:
> ```powershell
> python manoswaasth-ml/src/train.py
> ```



