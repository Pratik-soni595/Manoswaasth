exports.buildPrompt = ({ user, message, chatHistory, quizAttempt, flatQuestions, moodLog }) => {
  let prompt = `You are an Ayurvedic wellness companion. Give practical wellness/lifestyle guidance.
Never provide diagnosis, emergency direction, or harmful advice.
Keep your response concise (5-6 lines max).
Tone: calm, grounded, helpful, easy, and casual.

STRICT INSTRUCTION: Your abstract structure MUST contain the following three parameters and you MUST explicitly include these exact string labels to format your response:
Insight:
Recommendation:
One small action today:
`;

  prompt += `\n--- USER CONTEXT ---\n`;
  prompt += `Name: ${user.name || 'Friend'}\n`;
  prompt += `Primary Dosha: ${user.primaryDosha || 'Unknown'}\n`;

  if (moodLog) {
    prompt += `Latest Mood Score: ${moodLog.moodScore}/5 (${moodLog.label || 'No label'})\n`;
  }

  if (quizAttempt && flatQuestions) {
    prompt += `\nLatest Quiz Result:\n`;
    prompt += `Dominant Dosha: ${quizAttempt.dominantType}\n`;
    prompt += `Physical: ${quizAttempt.result.physical}, Metabolism: ${quizAttempt.result.metabolism}, Mental: ${quizAttempt.result.mental}\n`;
    
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
