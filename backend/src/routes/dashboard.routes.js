const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth); // All routes in this router require authentication

router.post('/mood', dashboardController.addMoodLog);
router.get('/mood', dashboardController.getMoodLogs);

router.post('/journal', dashboardController.saveJournalEntry);
router.get('/journal', dashboardController.getJournalEntries);

router.put('/routine', dashboardController.saveRoutine);
router.get('/routine', dashboardController.getRoutine);

router.get('/overview', dashboardController.getOverview);

module.exports = router;
