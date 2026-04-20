const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildPrompt } = require('../utils/promptBuilder');

let genAI;

const getModelForMode = (responseMode) => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  if (!genAI) return null;

  const maxTokens = responseMode === 'in_depth' ? 1500 : parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '300', 10);

  return genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview-1.5-flash',
    generationConfig: {
      maxOutputTokens: maxTokens,
    }
  });
};

const getFallbackResponse = () => {
  return `It seems the cosmic energies are a bit scattered right now, and I couldn't process that.\nPlease take a deep breath and give it another try in a moment.\nOne small action today: Drink a glass of warm water and relax your shoulders.`;
};

exports.generateAiResponse = async (context) => {
  const model = getModelForMode(context.responseMode);

  if (!model) {
    console.error('Gemini API is not configured (missing key). Using fallback response.');
    return getFallbackResponse();
  }

  try {
    const prompt = buildPrompt(context);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      console.warn('Gemini returned empty response. Using fallback.');
      return getFallbackResponse();
    }

    return text.trim();
  } catch (error) {
    console.error('Error in AI generation service:', error);
    return getFallbackResponse();
  }
};
