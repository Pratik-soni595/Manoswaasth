# Manoswaasth

Manoswaasth is an Ayurveda-inspired wellness platform that helps users understand their dosha profile, track daily wellness habits, build routines, receive personalized Dincharya micro-ritual recommendations adapted to modern work and sleep schedules, maintain a reflection journal, and receive holistic guidance through an AI chat companion.

The project is structured as a full-stack application with a React frontend, a Node.js/Express backend connected to MongoDB, and a separate Python machine learning inference microservice.

## Features

- User registration and login with JWT authentication
- Dosha assessment quiz with Vata, Pitta, and Kapha scoring
- **Personalized Dincharya Recommendations:** ML-powered daily micro-rituals (for work breaks, post-work transitions, bedtime wind-down, and morning waking) tailored to the user's primary Prakriti and schedule
- Personalized dashboard with profile, mood history, routine summary, journal preview, and Sattva points
- Mood tracking with daily logs
- Reflection journal with guna tags
- Morning and evening daily routine builder
- AI wellness chat companion powered by Google Gemini
- Protected frontend routes for authenticated users
- REST API with centralized error handling and rate limiting

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Framer Motion
- Recharts
- Lucide React

### Backend

- Node.js (v20+)
- Express
- MongoDB & Mongoose
- Passport & Passport JWT
- bcryptjs
- Google Generative AI SDK
- Express Rate Limit

### Machine Learning & Inference Microservice

- Python 3.10+ (tested on Python 3.13)
- FastAPI
- Uvicorn
- scikit-learn (Random Forest Multi-Target Classifiers)
- Pydantic v2
- Joblib
- NumPy & SciPy
- pytest

## Project Structure

```txt
manoswaasth/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── data/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── Frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── manoswaasth-ml/
│   ├── data/
│   │   ├── dincharya_synthetic_dataset.csv
│   │   └── task_catalogue.json
│   ├── models/
│   │   ├── dincharya_models.joblib
│   │   └── metrics.json
│   ├── src/
│   │   ├── api.py
│   │   ├── catalogue_loader.py
│   │   ├── dataset_generator.py
│   │   ├── feature_engineering.py
│   │   ├── model_pipeline.py
│   │   ├── preprocessing.py
│   │   ├── serve.py
│   │   ├── suitability_engine.py
│   │   └── train.py
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── WALKTHROUGH.md
│
├── .gitignore
└── README.md
```

## Prerequisites

Make sure the following are installed:

- **Node.js:** v20+ and **npm**
- **Python:** 3.10+ (with `pip`)
- **MongoDB:** local instance or MongoDB Atlas URI
- **Google Gemini API Key:** required for AI chat responses

## Environment Variables

### 1. Backend

Create a `.env` file inside `Backend/` (refer to `Backend/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/manoswaasth
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL_PRIMARY=gemini-1.5-flash
GEMINI_MODEL_SECONDARY=gemini-1.5-pro
GEMINI_MODEL_TERTIARY=gemini-2.0-flash

GEMINI_MAX_OUTPUT_TOKENS_QUICK=500
GEMINI_MAX_OUTPUT_TOKENS_IN_DEPTH=2000

# Dincharya Python ML Microservice
DINCHARYA_SERVICE_URL=http://127.0.0.1:8000
DINCHARYA_TIMEOUT_MS=5000
```

### 2. Frontend

Create a `.env` file inside `Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Python ML Microservice (Optional)

Create a `.env` file inside `manoswaasth-ml/` if custom host or port binding is needed (refer to `manoswaasth-ml/.env.example`):

```env
DINCHARYA_HOST=127.0.0.1
DINCHARYA_PORT=8000
```

## Installation

### 1. Install Python ML Dependencies

```bash
cd manoswaasth-ml
python -m pip install -r requirements.txt
```

### 2. Install Backend Dependencies

```bash
cd ../Backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../Frontend
npm install
```

## Running the Application

To run the complete platform, start the three services:

### Step 1: Start the Python ML Inference Microservice

```bash
cd manoswaasth-ml
python src/serve.py --host 127.0.0.1 --port 8000
```

The inference API runs on:
```txt
http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs
Health:   http://127.0.0.1:8000/health
```

### Step 2: Start the Node.js / Express Backend

```bash
cd Backend
npm run dev
```

The backend server runs on:
```txt
http://localhost:5000
```

### Step 3: Start the React Frontend

```bash
cd Frontend
npm run dev
```

The frontend client runs on the local Vite dev server (e.g. `http://localhost:5173`).

## Backend API Overview

### Health
```txt
GET  /api/health
```

### Authentication
```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Quiz (Dosha Assessment)
```txt
GET  /api/quiz/questions
POST /api/quiz/submit
GET  /api/quiz/latest-result
```

### Dashboard
```txt
GET  /api/dashboard/overview
POST /api/dashboard/mood
GET  /api/dashboard/mood
POST /api/dashboard/journal
GET  /api/dashboard/journal
PUT  /api/dashboard/routine
GET  /api/dashboard/routine
```

### AI Chat Companion
```txt
POST /api/ai/chat
```
Requires authentication and is rate-limited.

### Dincharya Recommendations
```txt
POST /api/dincharya/recommend
```
Requires authentication and is rate-limited.

- **Request Body:**
  ```json
  {
    "break_start": "13:00",
    "break_end": "13:15",
    "return_home_time": "18:30",
    "sleep_time": "23:00",
    "wake_time": "06:30"
  }
  ```
- **Behavior:** The backend automatically reads the user's saved Prakriti from MongoDB (`User.primaryDosha` or latest `QuizAttempt.dominantType`) and queries the Python microservice. Client-supplied doshas or task labels are rejected.
- **Error Responses:**
  - `400 Bad Request` with `code: "DOSHA_ASSESSMENT_REQUIRED"` if user has not completed the Dosha Quiz.
  - `400 Bad Request` if schedule times are malformed or work break ends before/at its start.
  - `503 Service Unavailable` if the Python microservice is offline or times out.

## Frontend Routes

```txt
/                   Home
/dosha-quiz         Dosha assessment quiz
/login              Login
/register           Register
/chat               AI wellness companion (Protected)
/dashboard          User dashboard (Protected)
/results            Dosha results (Protected)
/routine-builder    Routine builder & Personalized Dincharya (Protected)
/reflection-journal Reflection journal (Protected)
```

Protected routes require a valid JWT token.

## Testing & Verification

### Backend Tests (Node.js test runner)
```bash
cd Backend
npm test
```
Runs 11 test suites covering authentication, schedule validation, DB dosha resolution, error propagation, and response validation.

### Python ML Microservice Tests (pytest)
```bash
cd manoswaasth-ml
python -m pytest tests/ -v
```
Runs 76 tests covering catalogue integrity, suitability scoring, dataset generation, model pipeline, and API endpoints.

### Frontend Production Build & Lint
```bash
cd Frontend
npm run build
npm run lint
```

## Available Scripts

### Backend
- `npm run dev`: Starts the backend using nodemon for live reload.
- `npm start`: Starts the backend with Node.
- `npm test`: Runs the automated test suite using Node's native test runner.

### Frontend
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles production build into `dist/`.
- `npm run lint`: Runs ESLint.
- `npm run preview`: Previews the production build locally.

## Notes & Health Disclaimer

- **Wellness Guidance:** This application is designed for holistic wellness support and educational use. It does not provide medical diagnosis, clinical treatment, or professional healthcare advice.
- **Heuristic Recommendations:** Dincharya recommendations are synthetic model predictions trained from rule-based suitability heuristics inspired by traditional Ayurvedic principles. Users should listen to their bodies and consult certified healthcare practitioners for medical concerns.
