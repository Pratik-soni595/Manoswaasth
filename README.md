# Manoswaasth

Manoswaasth is an Ayurveda-inspired wellness platform that helps users understand their dosha profile, track daily wellness habits, build routines, maintain a reflection journal, and receive personalized wellness guidance through an AI chat companion.

The project is structured as a full-stack application with a React frontend and a Node.js/Express backend connected to MongoDB.

## Features

- User registration and login with JWT authentication
- Dosha assessment quiz with Vata, Pitta, and Kapha scoring
- Personalized dashboard with profile, mood history, routine summary, journal preview, and Sattva points
- Mood tracking with daily logs
- Reflection journal with guna tags
- Morning and evening routine builder
- AI wellness chat powered by Google Gemini
- Protected frontend routes for authenticated users
- REST API with centralized error handling

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Framer Motion
- Recharts
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- Passport
- JWT
- bcryptjs
- Google Generative AI SDK
- Express Rate Limit

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
└── .gitignore
```

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB, either local or hosted
- Google Gemini API key, required for AI chat responses

## Environment Variables

### Backend

Create a `.env` file inside `Backend/`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/manoswaasth
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL_PRIMARY=your_primary_model
GEMINI_MODEL_SECONDARY=your_secondary_model
GEMINI_MODEL_TERTIARY=your_tertiary_model

GEMINI_MAX_OUTPUT_TOKENS_QUICK=500
GEMINI_MAX_OUTPUT_TOKENS_IN_DEPTH=2000
```

### Frontend

Create a `.env` file inside `Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Installation

Install backend dependencies:

```bash
cd Backend
npm install
```

Install frontend dependencies:

```bash
cd ../Frontend
npm install
```

## Running the Application

Start the backend server:

```bash
cd Backend
npm run dev
```

The backend runs on:

```txt
http://localhost:5000
```

Start the frontend development server:

```bash
cd Frontend
npm run dev
```

The frontend runs on the local Vite URL shown in the terminal.

## Backend API Overview

### Health

```txt
GET /api/health
```

### Authentication

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Quiz

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

### AI Chat

```txt
POST /api/ai/chat
```

The AI chat endpoint requires authentication and is rate-limited.

## Frontend Routes

```txt
/                   Home
/dosha-quiz         Dosha assessment
/login              Login
/register           Register
/chat               AI wellness companion
/dashboard          User dashboard
/results            Dosha results
/routine-builder    Routine builder
/reflection-journal Reflection journal
```

Protected routes require a valid JWT token.

## Available Scripts

### Backend

```bash
npm run dev
```

Starts the backend using nodemon.

```bash
npm start
```

Starts the backend using Node.

### Frontend

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run preview
```

Previews the production build locally.

## Notes

This application is designed for wellness support and educational use. It does not provide medical diagnosis, treatment, or professional healthcare advice.




