const ChatMessage = require('../models/ChatMessage');
const QuizAttempt = require('../models/QuizAttempt');
const MoodLog = require('../models/MoodLog');
const { getFlatQuestions } = require('../data/quizData');
const { generateAiResponse } = require('../services/ai.service');

const normalizeAiText = (text) => {
  if (!text) {
    return "Insight: I wasn't able to generate a response.\nRecommendation: Please take a moment and try again.\nOne small action today: Drink some warm water.";
  }
  
  if (!text.includes('Insight:') && (!text.includes('Recommendation:') || !text.includes('One small action today:'))) {
    // If format is missed, forcefully adapt it
    return `Insight: ${text.replace(/\n/g, ' ')}\nRecommendation: Keep practicing mindful awareness throughout your day.\nOne small action today: Take 5 deep breaths before your next activity.`;
  }
  return text;
};

exports.handleChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message is too long. Please keep it under 1000 characters.' });
    }

    const { user } = req;
    
    // Save user message immediately as requested
    const userMsg = await ChatMessage.create({
      userId: user._id,
      role: 'user',
      content: message.trim(),
    });

    // Fetch quiz context
    const quizAttempt = await QuizAttempt.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .exec();
      
    // Fetch mood context
    const moodLog = await MoodLog.findOne({ userId: user._id })
      .sort({ loggedAt: -1 })
      .exec();

    // Fetch recent chat history
    const recentMessages = await ChatMessage.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(6) 
      .exec();
      
    // Filter out the message we just saved, limit to 5, reverse to get chronological order
    const chatHistory = recentMessages
      .filter(msg => msg._id.toString() !== userMsg._id.toString())
      .slice(0, 5)
      .reverse();

    let flatQuestions;
    try {
      flatQuestions = getFlatQuestions();
    } catch (e) {
      flatQuestions = [];
    }

    const context = {
      user,
      message: message.trim(),
      chatHistory,
      quizAttempt,
      flatQuestions,
      moodLog
    };

    let aiText = await generateAiResponse(context);
    aiText = normalizeAiText(aiText);

    // Save the assistant's reply
    const aiMsg = await ChatMessage.create({
      userId: user._id,
      role: 'assistant',
      content: aiText,
    });

    res.status(200).json({
      reply: aiMsg.content
    });

  } catch (error) {
    next(error);
  }
};
