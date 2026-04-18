import { client } from './client';

export const sendChatMessage = async (message) => {
  return await client.post('/ai/chat', { message });
};
