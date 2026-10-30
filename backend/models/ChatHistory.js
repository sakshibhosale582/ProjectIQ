const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
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
  messages: [
    {
      sender: {
        type: String,
        enum: ['user', 'bot'],
        required: true
      },
      text: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

// Index for quick queries
ChatHistorySchema.index({ user: 1, project: 1 });

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
