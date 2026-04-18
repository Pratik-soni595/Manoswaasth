const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth.middleware');
const { handleChatMessage } = require('../controllers/ai.controller');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    // requireAuth runs first, so req.user is guaranteed.

    return (req.user && req.user._id) ? req.user._id.toString() : 'unauthenticated';
  },
  message: { ok: false, message: 'Too many messages sent. Please pause and try again after 15 minutes.' }
});

router.post('/chat', requireAuth, aiLimiter, handleChatMessage);

module.exports = router;
