import { client } from './client';

export const dashboardApi = {
  getOverview: () => client.get('/dashboard/overview'),
  addMoodLog: (moodScore, label) => client.post('/dashboard/mood', { moodScore, label }),
  saveJournalEntry: (content, gunaTag) => client.post('/dashboard/journal', { content, gunaTag }),
  saveRoutine: (routineData) => client.put('/dashboard/routine', routineData),
};
