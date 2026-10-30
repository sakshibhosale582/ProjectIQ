const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
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
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  questions: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correct: { type: Number, required: true },
      explanation: { type: String },
      file: { type: String },
      startLine: { type: Number },
      endLine: { type: Number },
      code: { type: String }
    }
  ],
  answers: [{ type: Number }], // Array of option indexes selected by user
  score: {
    type: Number,
    required: true
  },
  explanationSummary: {
    strength: { type: String, default: '' },
    weakness: { type: String, default: '' },
    evidence: { type: String, default: '' },
    recommendation: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
