const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth.middleware');
const { getRecommendations } = require('../controllers/dincharya.controller');

const dincharyaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    return req.user && req.user._id ? req.user._id.toString() : 'unauthenticated';
  },
  message: {
    ok: false,
    message: 'Too many recommendation requests. Please pause and try again after 15 minutes.',
  },
});

router.post('/recommend', requireAuth, dincharyaLimiter, getRecommendations);

module.exports = router;

