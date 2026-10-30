const mongoose = require('mongoose');

/**
 * One generated quiz attempt. The answer key (correctIndex) lives ONLY here, on the server.
 * The client receives the public question list and must send back its answers to be graded.
 */
const QuizSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  kind: { type: String, enum: ['quiz', 'practice'], default: 'quiz' },
  source: { type: String, enum: ['ai', 'static'], default: 'static' },
  questions: { type: [mongoose.Schema.Types.Mixed], default: [] }, // includes correctIndex + explanation
  snippetKeys: { type: [String], default: [] },                       // "path:startLine" used, to avoid repeats
  submitted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 } // auto-delete after 24h
});

QuizSessionSchema.index({ project: 1, user: 1, createdAt: -1 });

module.exports = mongoose.model('QuizSession', QuizSessionSchema);
