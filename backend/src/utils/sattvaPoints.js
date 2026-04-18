const SattvaPointEvent = require('../models/SattvaPointEvent');

const POINTS = {
  mood: 5,
  routine: 2,
  journal: 10,
};

const calculateSattvaPoints = (events) => {
  if (!events || events.length === 0) return 0;
  return events.reduce((total, event) => total + event.delta, 0);
};

const createSattvaEvent = async ({ userId, source, delta, meta = {} }) => {
  return await SattvaPointEvent.create({
    userId,
    source,
    delta,
    meta,
  });
};

const getTotalPointsForUser = async (userId) => {
  // Aggregate is generally better, but find & reduce is fine for minimalist setup
  const events = await SattvaPointEvent.find({ userId });
  return calculateSattvaPoints(events);
};


module.exports = {
  POINTS,
  calculateSattvaPoints,
  createSattvaEvent,
  getTotalPointsForUser,
};
