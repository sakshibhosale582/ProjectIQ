const mongoose = require('mongoose');

const VivaAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  questions: [{ type: String, required: true }],
  answers: [{ type: String }],
  score: {
    type: Number,
    required: true
  },
  feedback: {
    type: [String],
    default: []
  },
  explanationSummary: {
    strength: { type: String, default: '' },
    weakness: { type: String, default: '' },
    evidence: { type: String, default: '' },
    recommendation: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('VivaAttempt', VivaAttemptSchema);
