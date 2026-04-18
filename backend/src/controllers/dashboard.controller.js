const MoodLog = require('../models/MoodLog');
const JournalEntry = require('../models/JournalEntry');
const Routine = require('../models/Routine');
const SattvaPointEvent = require('../models/SattvaPointEvent');
const { POINTS, createSattvaEvent, getTotalPointsForUser } = require('../utils/sattvaPoints');

exports.addMoodLog = async (req, res, next) => {
  try {
    const { moodScore, label } = req.body;

    if (moodScore === undefined || isNaN(moodScore) || moodScore < 1 || moodScore > 5) {
      return res.status(400).json({ message: 'moodScore must be a number between 1 and 5' });
    }

    const now = new Date();
    const loggedDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const result = await MoodLog.findOneAndUpdate(
      { userId: req.user._id, loggedDate },
      {
        $set: {
          moodScore,
          label,
          loggedAt: now,
        }
      },
      {
        new: true,
        upsert: true,
        includeResultMetadata: true,
      }
    );

    const mood = result.value;
    const wasUpdated = result.lastErrorObject.updatedExisting;

    if (!wasUpdated) {
      await createSattvaEvent({
        userId: req.user._id,
        source: 'mood',
        delta: POINTS.mood,
        meta: { moodLogId: mood._id },
      });
    }

    const totalPoints = await getTotalPointsForUser(req.user._id);

    res.status(wasUpdated ? 200 : 201).json({
      message: wasUpdated ? "Today's mood updated" : 'Mood logged successfully',
      mood,
      totalPoints,
      wasUpdated,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMoodLogs = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const logs = await MoodLog.find({ userId: req.user._id, loggedAt: { $gte: dateLimit } })
      .sort({ loggedAt: -1 });

    res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
};

exports.saveJournalEntry = async (req, res, next) => {
  try {
    const { content, gunaTag } = req.body;

    if (!content || content.trim().length < 3) {
      return res.status(400).json({ message: 'content must be at least 3 characters long' });
    }

    const entry = await JournalEntry.create({
      userId: req.user._id,
      content: content.trim(),
      gunaTag,
    });

    await createSattvaEvent({
      userId: req.user._id,
      source: 'journal',
      delta: POINTS.journal,
      meta: { journalId: entry._id },
    });

    const totalPoints = await getTotalPointsForUser(req.user._id);

    res.status(201).json({
      message: 'Journal entry saved successfully',
      entry,
      totalPoints,
    });
  } catch (error) {
    next(error);
  }
};

exports.getJournalEntries = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const entries = await JournalEntry.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ entries });
  } catch (error) {
    next(error);
  }
};

exports.saveRoutine = async (req, res, next) => {
  try {
    const { morning, evening } = req.body;

    if (morning && !Array.isArray(morning)) {
      return res.status(400).json({ message: 'morning routine must be an array' });
    }
    if (evening && !Array.isArray(evening)) {
      return res.status(400).json({ message: 'evening routine must be an array' });
    }

    const updateData = {};
    if (morning) updateData.morning = morning;
    if (evening) updateData.evening = evening;

    const routine = await Routine.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );

    await createSattvaEvent({
      userId: req.user._id,
      source: 'routine',
      delta: POINTS.routine,
    });

    const totalPoints = await getTotalPointsForUser(req.user._id);

    res.status(200).json({
      message: 'Routine updated successfully',
      routine,
      totalPoints,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRoutine = async (req, res, next) => {
  try {
    let routine = await Routine.findOne({ userId: req.user._id });

    if (!routine) {
      routine = { morning: [], evening: [] };
    }

    res.status(200).json({ routine });
  } catch (error) {
    next(error);
  }
};

exports.getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch in parallel for efficiency
    const [points, latestMoodLog, recentMoods, latestJournalLog, routineDoc, pointEventsList] = await Promise.all([
      getTotalPointsForUser(userId),
      MoodLog.findOne({ userId }).sort({ loggedAt: -1 }),
      MoodLog.find({ userId }).sort({ loggedAt: -1 }).limit(7), // Default overview limits
      JournalEntry.findOne({ userId }).sort({ createdAt: -1 }),
      Routine.findOne({ userId }),
      SattvaPointEvent.find({ userId }).sort({ createdAt: -1 }).limit(10), // Limit recent events
    ]);

    res.status(200).json({
      profile: {
        name: req.user.name,
        primaryDosha: req.user.primaryDosha,
      },
      sattvaPoints: points,
      latestMood: latestMoodLog || null,
      recentMoods: recentMoods,
      latestJournal: latestJournalLog || null,
      routine: routineDoc || { morning: [], evening: [] },
      pointEvents: pointEventsList,
    });
  } catch (error) {
    next(error);
  }
};
