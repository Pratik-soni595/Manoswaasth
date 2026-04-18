const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const { getFlatQuestions } = require('../data/quizData');
const { calculateDoshaResult } = require('../utils/doshaCalculator');

exports.getQuestions = (req, res, next) => {
  try {
    const questions = getFlatQuestions();
    res.status(200).json({ questions });
  } catch (error) {
    next(error);
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    // Reject empty answer arrays
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Answers array is required and cannot be empty' });
    }

    const flatQuestions = getFlatQuestions();
    const validDoshas = ['Vata', 'Pitta', 'Kapha'];
    const validQuestionIds = new Set(flatQuestions.map((q) => q.id));

    for (const answer of answers) {
      if (!answer.questionId || !answer.selectedDosha) {
        return res.status(400).json({ message: 'Each answer must have questionId and selectedDosha' });
      }
      if (!validDoshas.includes(answer.selectedDosha)) {
        return res.status(400).json({ message: `selectedDosha must be one of Vata|Pitta|Kapha. Received: ${answer.selectedDosha}` });
      }
      // Cleanest policy: reject consistently if question ID is not found
      if (!validQuestionIds.has(answer.questionId)) {
        return res.status(400).json({ message: `Unknown questionId: ${answer.questionId}` });
      }
    }

    const { result, dominantType } = calculateDoshaResult(answers, flatQuestions);

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      answers,
      result,
      dominantType,
    });

    await User.findByIdAndUpdate(req.user._id, { primaryDosha: dominantType });

    res.status(201).json({
      message: 'Quiz submitted successfully',
      attemptId: attempt._id,
      result: attempt.result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLatestResult = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .exec();

    if (!attempt) {
      return res.status(404).json({ message: 'No quiz attempts found for this user' });
    }

    res.status(200).json({
      result: attempt.result,
      dominantType: attempt.dominantType,
      attemptId: attempt._id,
      createdAt: attempt.createdAt,
    });
  } catch (error) {
    next(error);
  }
};
