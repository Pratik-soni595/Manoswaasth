import { client } from './client';

export const quizApi = {
  getQuestions: () => client.get('/quiz/questions'),
  submitQuiz: (answers) => client.post('/quiz/submit', { answers }),
  getLatestResult: () => client.get('/quiz/latest-result'),
};
