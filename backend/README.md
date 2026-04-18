# College Project Backend

A minimal Node.js backend using Express, MongoDB, and Passport for authentication.

## Features
- Express API with MongoDB connection
- User Registration & Login
- Password Hashing with bcryptjs
- JWT Authentication via Passport

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env` and fill in the values:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/manoswaasth
   JWT_SECRET=supersecretjwtkey
   ```

3. **Run the Server**
   - For development:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

## Endpoints

### 1. Healthcheck
- `GET /api/health`
  - Validates API status.

### 2. Authentication
- `POST /api/auth/register`
  - Registers a new user. Required body fields: `name`, `email`, `password`.
- `POST /api/auth/login`
  - Logs in an existing user. Required body fields: `email`, `password`. Returns JWT token.
- `GET /api/auth/me`
  - Protected route. Retrieves profile of the logged-in user. Requires `Authorization: Bearer <token>` header.
  - without token => 401
  - with valid token => user profile

### 3. Quiz
- `GET /api/quiz/questions`
  - Fetches the flattened quiz questions.
- `POST /api/quiz/submit` (Auth required)
  - Submits quiz attempt and calculates your doshas.
- `GET /api/quiz/latest-result` (Auth required)
  - Fetches your latest submitted quiz attempt payload.

### 4. Dashboard
- `POST /api/dashboard/mood` (Auth required)
  - Log your daily mood (1-5) and score 5 Sattva points.
- `POST /api/dashboard/journal` (Auth required)
  - Create a journal entry and score 10 Sattva points.
- `PUT /api/dashboard/routine` (Auth required)
  - Save morning/evening routines and score 2 Sattva points.
- `GET /api/dashboard/overview` (Auth required)
  - Retrieves a full profile overview with aggregated points, recent logs, and routines.

## Sample Requests

### Healthcheck
```bash
curl http://localhost:5000/api/health
```

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","password":"password123"}'
```

### Get Current User Profile (Unauthorized)
```bash
curl http://localhost:5000/api/auth/me
```

### Get Current User Profile
```bash
curl http://localhost:5000/api/auth/me \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Quiz Questions
```bash
curl http://localhost:5000/api/quiz/questions
```

### Submit Quiz Attempt
```bash
curl -X POST http://localhost:5000/api/quiz/submit \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{
  "answers": [
    { "questionId": "body_frame", "selectedDosha": "Vata" }
  ]
}'
```

### Get Latest Quiz Result
```bash
curl http://localhost:5000/api/quiz/latest-result \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Dashboard: Add Mood Log
```bash
curl -X POST http://localhost:5000/api/dashboard/mood \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{"moodScore": 4, "label": "Great"}'
```

### Dashboard: Save Journal
```bash
curl -X POST http://localhost:5000/api/dashboard/journal \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{"content": "Felt deeply peaceful after morning meditation.", "gunaTag": "Sattvic"}'
```

### Dashboard: Save Routine
```bash
curl -X PUT http://localhost:5000/api/dashboard/routine \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-d '{"morning": ["Meditation", "Yoga"], "evening": ["Herbal Tea"]}'
```

### Dashboard: Get Overview
```bash
curl http://localhost:5000/api/dashboard/overview \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```
