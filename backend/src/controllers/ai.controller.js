const ChatMessage = require('../models/ChatMessage');
const QuizAttempt = require('../models/QuizAttempt');
const MoodLog = require('../models/MoodLog');
const { getFlatQuestions } = require('../data/quizData');
const { generateAiResponse } = require('../services/ai.service');

const normalizeQuickTipsText = (text) => {
  if (!text) {
    return "I wasn't able to process that right now. Please take a moment and try again.";
  }
  
  // Safely strip the explicit markers if the model accidentally includes them
  return text
    .replace(/^Insight:\s*/i, '')
    .replace(/\nRecommendation:\s*/i, '\n\n')
    .replace(/\nOne small action today:\s*/i, '\n\n')
    .trim();
};

const normalizeInDepthText = (text) => {
  if (!text) {
    return "I wasn't able to process that right now. Please take a moment and try again.";
  }

  // Strip explicit headers if the model accidentally includes them, 
  // catching variations with or without bolding, colons, and newlines.
  return text
    .replace(/^(?:\*\*)?Summary(?:\*\*)?[:\s]*\n?/i, '')
    .replace(/\n+(?:\*\*)?Detailed Guidance(?:\*\*)?[:\s]*\n?/ig, '\n\n')
    .replace(/\n+(?:\*\*)?Action Plan(?:\*\*)?[:\s]*\n?/ig, '\n\n')
    .replace(/\n+(?:\*\*)?When to Seek Professional Help(?:\*\*)?[:\s]*\n?/ig, '\n\n')
    .replace(/\n+(?:\*\*)?Next Question(?:\*\*)?[:\s]*\n?/ig, '\n\n')
    .trim();
};

exports.handleChatMessage = async (req, res, next) => {
  try {
    let { message, responseMode } = req.body;
    
    if (responseMode !== 'quick_tips' && responseMode !== 'in_depth') {
      responseMode = 'quick_tips';
    }
    
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
      moodLog,
      responseMode
    };

    let aiText = await generateAiResponse(context);
    
    if (responseMode === 'in_depth') {
      aiText = normalizeInDepthText(aiText);
    } else {
      aiText = normalizeQuickTipsText(aiText);
    }

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
