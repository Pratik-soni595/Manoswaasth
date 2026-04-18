import { client } from './client';

export const authApi = {
  register: (userData) => client.post('/auth/register', userData),
  login: (credentials) => client.post('/auth/login', credentials),
  getMe: () => client.get('/auth/me'),
};
