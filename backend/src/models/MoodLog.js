const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    moodScore: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    label: {
      type: String,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
    },
    loggedDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

moodLogSchema.index({ userId: 1, loggedDate: 1 }, { unique: true });

module.exports = mongoose.model('MoodLog', moodLogSchema);
