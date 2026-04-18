import { client } from './client';

export const sendChatMessage = async (message, responseMode = 'quick_tips') => {
  return await client.post('/ai/chat', { message, responseMode });
};
