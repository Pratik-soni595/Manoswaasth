require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mock for failover testing
const originalGetModel = GoogleGenerativeAI.prototype.getGenerativeModel;
GoogleGenerativeAI.prototype.getGenerativeModel = function(options) {
  const model = originalGetModel.call(this, options);
  const originalGenerate = model.generateContent;
  
  model.generateContent = async function(prompt) {
     const fails503 = (process.env.SIMULATE_503_ON || '').split(',');
     if (fails503.includes(options.model)) {
        const err = new Error(`Simulated 503 Service Unavailable on ${options.model}`);
        err.status = 503;
        throw err;
     }
     
     const fails400 = (process.env.SIMULATE_400_ON || '').split(',');
     if (fails400.includes(options.model)) {
        const err = new Error(`Simulated 400 Bad Request on ${options.model}`);
        err.status = 400;
        throw err;
     }
     
     // Success simulation to avoid actual API calls and rate limits during the test
     // unless we actually want to hit it. We'll just return a mock response for speed.
     return {
       response: {
         text: () => `Mock success response from ${options.model}`,
         candidates: [{ finishReason: 'STOP' }]
       }
     };
  };
  return model;
};

const { generateAiResponse } = require('./src/services/ai.service.js');

async function runTests() {
  console.log("=== API Testing Pipeline (Failover Edition) ===\n");
  
  const testContext = {
    user: { name: 'Pratik', primaryDosha: 'Vata' },
    message: 'Stress Relief',
    chatHistory: [],
    quizAttempt: null,
    flatQuestions: [],
    moodLog: { moodScore: 3, label: 'Average' },
    responseMode: 'quick_tips'
  };

  const runScenario = async (name, setupEnv) => {
    console.log(`--- ${name} ---`);
    
    // Reset env
    delete process.env.GEMINI_MODEL_PRIMARY;
    delete process.env.GEMINI_MODEL_SECONDARY;
    delete process.env.GEMINI_MODEL_TERTIARY;
    delete process.env.GEMINI_MODEL;
    delete process.env.SIMULATE_503_ON;
    delete process.env.SIMULATE_400_ON;
    
    setupEnv();
    
    try {
      const output = await generateAiResponse(testContext);
      console.log('Final Output:', output.replace(/\n/g, ' '));
    } catch (e) {
      console.error('Unexpected unhandled error:', e.message);
    }
    console.log("\n");
  };

  await runScenario("Test Case 1: Legacy mode (only GEMINI_MODEL)", () => {
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';
  });

  await runScenario("Test Case 2: Primary succeeds", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = 'gemini-1.5-flash';
  });

  await runScenario("Test Case 3: Primary 503 -> Failover to Secondary", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = 'gemini-1.5-flash';
    process.env.SIMULATE_503_ON = 'gemini-1.5-pro';
  });

  await runScenario("Test Case 4: Primary & Secondary 503 -> Failover to Tertiary", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = 'gemini-1.5-flash';
    process.env.GEMINI_MODEL_TERTIARY = 'gemini-2.0-flash';
    process.env.SIMULATE_503_ON = 'gemini-1.5-pro,gemini-1.5-flash';
  });

  await runScenario("Test Case 5: All models 503 -> Fallback", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = 'gemini-1.5-flash';
    process.env.GEMINI_MODEL_TERTIARY = 'gemini-2.0-flash';
    process.env.SIMULATE_503_ON = 'gemini-1.5-pro,gemini-1.5-flash,gemini-2.0-flash';
  });

  await runScenario("Test Case 6: Primary 400 -> Fallback without failover", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = 'gemini-1.5-flash';
    process.env.SIMULATE_400_ON = 'gemini-1.5-pro';
  });
  
  await runScenario("Test Case 7 & 8: Duplicate and missing env vars cleanly handled", () => {
    process.env.GEMINI_MODEL_PRIMARY = 'gemini-1.5-pro';
    process.env.GEMINI_MODEL_SECONDARY = '  '; // blank
    process.env.GEMINI_MODEL_TERTIARY = 'gemini-1.5-pro'; // duplicate
    process.env.GEMINI_MODEL = 'gemini-something-else'; // should be ignored since primary exists
    process.env.SIMULATE_503_ON = 'gemini-1.5-pro'; // should fail primary and not retry duplicate
  });
}

runTests();
