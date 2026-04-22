const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildPrompt } = require('../utils/promptBuilder');

let genAI;

const getGenAI = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Resolves the list of Gemini models to attempt, in priority order.
 * 
 * New Environment Variables:
 * - GEMINI_MODEL_PRIMARY: Attempted first.
 * - GEMINI_MODEL_SECONDARY: Attempted if primary fails with 503/High Demand.
 * - GEMINI_MODEL_TERTIARY: Attempted if secondary fails with 503/High Demand.
 * 
 * Legacy Fallback:
 * - GEMINI_MODEL: If GEMINI_MODEL_PRIMARY is missing, this acts as the primary model.
 *   This ensures backward compatibility for existing deployments.
 * 
 * Failover behavior:
 * Failover ONLY happens for retryable errors (503 Service Unavailable, High Demand).
 * Non-retryable errors (e.g. 400 Bad Request, missing key) will immediately use the fallback response.
 */
const getConfiguredModels = () => {
  const models = [];
  const addModel = (modelName) => {
    if (modelName && typeof modelName === 'string') {
      const trimmed = modelName.trim();
      if (trimmed !== '' && !models.includes(trimmed)) {
        models.push(trimmed);
      }
    }
  };

  const primary = process.env.GEMINI_MODEL_PRIMARY;
  const legacy = process.env.GEMINI_MODEL;
  
  if (primary && primary.trim() !== '') {
    addModel(primary);
  } else if (legacy && legacy.trim() !== '') {
    addModel(legacy);
  }

  addModel(process.env.GEMINI_MODEL_SECONDARY);
  addModel(process.env.GEMINI_MODEL_TERTIARY);

  // If still empty, fall back to default
  if (models.length === 0) {
    models.push('gemini-3.1-pro-preview');
  }

  return models;
};

const getMaxTokensForMode = (responseMode) => {
  if (responseMode === 'in_depth') {
    // 1. In-depth takes specific env var or fallback, enforcing 1500 floor
    const rawTokens = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS_IN_DEPTH || process.env.GEMINI_MAX_OUTPUT_TOKENS || '2000', 10);
    return Math.max(rawTokens, 1500);
  } else {
    // 2. Quick-tips takes specific env var or fallback, enforcing 400 floor 
    const rawTokens = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS_QUICK || process.env.GEMINI_MAX_OUTPUT_TOKENS || '500', 10);
    return Math.max(rawTokens, 400);
  }
};

const isRetryableError = (error) => {
  if (!error) return false;
  
  const status = error.status || error.statusCode;
  if (status === 503) return true;
  
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('503')) return true;
  if (msg.includes('service unavailable')) return true;
  if (msg.includes('currently experiencing high demand')) return true;
  if (msg.includes('try again later')) return true;

  return false;
};

const getFallbackResponse = () => {
  return `It seems the cosmic energies are a bit scattered right now, and I couldn't process that.\nPlease take a deep breath and give it another try in a moment.\nOne small action today: Drink a glass of warm water and relax your shoulders.`;
};

exports.generateAiResponse = async (context) => {
  const aiInstance = getGenAI();
  if (!aiInstance) {
    console.error('Gemini API is not configured (missing key). Using fallback response.');
    return getFallbackResponse();
  }

  const modelsToTry = getConfiguredModels();
  if (modelsToTry.length === 0) {
    console.error('No Gemini models configured. Using fallback response.');
    return getFallbackResponse();
  }

  const maxTokens = getMaxTokensForMode(context.responseMode);
  const prompt = buildPrompt(context);
  
  console.log(`Starting AI generation. Configured models: [${modelsToTry.join(', ')}]`);

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    console.log(`Attempt ${i + 1}/${modelsToTry.length}: Using model ${modelName}`);

    const model = aiInstance.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: maxTokens,
      }
    });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim() === '') {
        console.warn(`Model ${modelName} returned empty response. Using fallback.`);
        return getFallbackResponse();
      }

      // Protect against API-level token quota truncations that don't throw 429 errors
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`Model ${modelName} generation stopped prematurely. Reason: ${finishReason}. Using fallback.`);
        return getFallbackResponse();
      }

      console.log(`Success: Model ${modelName} generated response.`);
      return text.trim();

    } catch (error) {
      if (isRetryableError(error)) {
        console.warn(`Attempt ${i + 1} failed with retryable error (503/High Demand) on model ${modelName}.`);
        if (i < modelsToTry.length - 1) {
          console.log('Failing over to next configured model...');
          continue;
        } else {
          console.error(`All configured models exhausted. Final error on model ${modelName}:`, error.message);
          return getFallbackResponse();
        }
      } else {
        console.error(`Attempt ${i + 1} failed with non-retryable error on model ${modelName}:`, error.message);
        return getFallbackResponse();
      }
    }
  }

  return getFallbackResponse();
};
