const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    primaryDosha: {
      type: String,
      enum: ['Vata', 'Pitta', 'Kapha'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
