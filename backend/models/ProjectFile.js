const mongoose = require('mongoose');

/**
 * Source text of every analysed file of a project (size capped by the upload pipeline).
 * Used by the File Inspector, the code-grounded quiz, security re-scans and "Explain this file".
 */
const ProjectFileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  path: { type: String, required: true },
  language: { type: String, default: '' },
  content: { type: String, default: '' },
  lineCount: { type: Number, default: 0 },
  importance: { type: Number, default: 0 }
}, { timestamps: true });

ProjectFileSchema.index({ project: 1, path: 1 }, { unique: true });
ProjectFileSchema.index({ project: 1, user: 1, importance: -1 });

module.exports = mongoose.model('ProjectFile', ProjectFileSchema);
