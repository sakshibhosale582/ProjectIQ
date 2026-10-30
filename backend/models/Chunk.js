const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
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
  filePath: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  // Empty when the project is indexed in keyword mode (no embedding quota available)
  embedding: {
    type: [Number],
    default: []
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  startLine: { type: Number, default: 1 },
  endLine: { type: Number, default: 1 }
}, { timestamps: true });

// Scope search indexes by project to isolate queries
ChunkSchema.index({ project: 1, user: 1 });

module.exports = mongoose.model('Chunk', ChunkSchema);
