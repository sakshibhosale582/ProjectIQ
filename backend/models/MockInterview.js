const mongoose = require('mongoose');

const MockInterviewSchema = new mongoose.Schema({
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
  questionEvaluations: [
    {
      question: { type: String },
      answer: { type: String },
      category: { type: String, default: 'General Technical' },
      correctness: { type: String, default: 'Adequate' },
      score: { type: Number, default: 70 },
      explainedWell: { type: String, default: '' },
      missingPoints: { type: String, default: '' },
      couldImprove: { type: String, default: '' },
      sampleAnswer: { type: String, default: '' }
    }
  ],
  evaluation: {
    communication: { type: Number, required: true },
    technicalDepth: { type: Number, required: true },
    projectKnowledge: { type: Number, required: true }
  },
  weakAreas: [{ type: String }],
  recommendations: [{ type: String }],
  finalScore: {
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

module.exports = mongoose.model('MockInterview', MockInterviewSchema);
