const mongoose = require('mongoose');

const LearningProgressSchema = new mongoose.Schema({
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
  moduleId: {
    type: String,
    required: true
  },
  completionStatus: {
    type: String,
    enum: ['locked', 'in-progress', 'completed'],
    default: 'locked'
  },
  progress: {
    type: Number,
    default: 0 // percentage 0 - 100
  }
}, { timestamps: true });

// Ensure unique index per user + project + module
LearningProgressSchema.index({ user: 1, project: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', LearningProgressSchema);
