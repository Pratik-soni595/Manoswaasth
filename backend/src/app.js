const express = require('express');
const cors = require('cors');
const passport = require('passport');
const setupPassport = require('./config/passport');
const { errorHandler } = require('./middleware/error.middleware');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const quizRoutes = require('./routes/quiz.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize Passport
app.use(passport.initialize());
setupPassport(passport);

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ ok: false, message: 'Route not found' });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
