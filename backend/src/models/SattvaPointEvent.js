const mongoose = require('mongoose');

const sattvaPointEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['mood', 'routine', 'journal'],
      required: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SattvaPointEvent', sattvaPointEventSchema);
