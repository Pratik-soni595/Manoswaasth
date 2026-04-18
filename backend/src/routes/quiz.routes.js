const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/questions', quizController.getQuestions);

router.post('/submit', requireAuth, quizController.submitQuiz);

router.get('/latest-result', requireAuth, quizController.getLatestResult);

module.exports = router;
