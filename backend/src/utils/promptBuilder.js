exports.buildPrompt = ({ user, message, chatHistory, quizAttempt, flatQuestions, moodLog, responseMode = 'quick_tips' }) => {
  let prompt = `You are an Ayurvedic wellness companion. Give practical wellness/lifestyle guidance.
Never provide diagnosis, emergency direction, or harmful advice.
Tone: calm, grounded, helpful, easy, and casual.

`;

  if (responseMode === 'in_depth') {
    prompt += `STRICT INSTRUCTION FOR IN-DEPTH MODE:
Your output must contain:
A short Summary of user's problem
Detailed Guidance for user
Action Plan (You may provide this in points or steps, this has to be the longest part of the response)
When to Seek Professional Help (keep this part concise)
Next Question (if relevant)

However, you MUST NOT explicitly include literal markers (e.g., "Summary:", "action plan:"). Be thorough, detailed, and personalized.
`;
  } else {
    prompt += `STRICT INSTRUCTION FOR QUICK-TIPS MODE:
Keep your response concise (5-6 lines max).
Your abstract structure MUST contain three core parameters: an insight, a recommendation, and a small action today.
However, you MUST NOT explicitly include literal markers (e.g., "Insight:", "Recommendation:"). Just provide the paragraphs seamlessly.
`;
  }

  prompt += `\n--- USER CONTEXT ---\n`;
  prompt += `Name: ${user.name || 'Friend'}\n`;
  prompt += `Primary Dosha: ${user.primaryDosha || 'Unknown'}\n`;

  if (moodLog) {
    prompt += `Latest Mood Score: ${moodLog.moodScore}/5 (${moodLog.label || 'No label'})\n`;
  }

  if (quizAttempt && flatQuestions) {
    prompt += `\nLatest Quiz Result:\n`;
    prompt += `Physical Dosha: ${quizAttempt.result.physical}, Metabolism Dosha: ${quizAttempt.result.metabolism}, Mental Dosha: ${quizAttempt.result.mental}\n`;
    prompt += `\nQuiz Answers:\n`;
    quizAttempt.answers.forEach(ans => {
      const q = flatQuestions.find(fq => fq.id === ans.questionId);
      if (q) {
        prompt += `- ${q.question}: ${ans.selectedDosha}\n`;
      }
    });
  } else {
    prompt += `\nNote: The user hasn't completed their Dosha quiz yet. If appropriate, gently suggest they attempt the quiz for more personalized insights.\n`;
  }

  prompt += `\n--- CONVERSATION HISTORY ---\n`;
  if (chatHistory && chatHistory.length > 0) {
    chatHistory.forEach(msg => {
      const roleStr = msg.role === 'user' ? 'User' : 'Assistant';
      prompt += `${roleStr}: ${msg.content}\n`;
    });
  } else {
    prompt += `(No previous messages)\n`;
  }

  prompt += `\n--- CURRENT MESSAGE ---\n`;
  prompt += `User: ${message}\n`;
  prompt += `Assistant: `;

  return prompt;
};
