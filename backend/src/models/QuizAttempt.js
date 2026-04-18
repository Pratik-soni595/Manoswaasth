const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [
      {
        questionId: { type: String, required: true },
        selectedDosha: {
          type: String,
          enum: ['Vata', 'Pitta', 'Kapha'],
          required: true,
        },
      },
    ],
    result: {
      physical: { type: String, enum: ['Vata', 'Pitta', 'Kapha'], required: true },
      metabolism: { type: String, enum: ['Vata', 'Pitta', 'Kapha'], required: true },
      mental: { type: String, enum: ['Vata', 'Pitta', 'Kapha'], required: true },
    },
    dominantType: {
      type: String,
      enum: [
        'Vata',
        'Pitta',
        'Kapha',
        'Vata-Pitta',
        'Pitta-Kapha',
        'Vata-Kapha',
        'Vata-Pitta-Kapha',
      ],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
