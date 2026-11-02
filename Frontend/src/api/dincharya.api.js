import { client } from './client';

export const dincharyaApi = {
  getRecommendations: (scheduleData) => client.post('/dincharya/recommend', scheduleData),
};

