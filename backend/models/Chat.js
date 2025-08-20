const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  pdfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PDF',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  context: {
    retrievedChunks: [{
      chunkId: String,
      content: String,
      pageNumber: Number,
      similarity: Number,
      relevance: Number
    }],
    totalChunksRetrieved: Number,
    averageSimilarity: Number
  },
  metadata: {
    questionEmbedding: [Number],
    questionTokens: Number,
    answerTokens: Number,
    processingTime: Number,
    modelUsed: String,
    temperature: Number,
    maxTokens: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userSession: {
    type: String,
    required: false
  },
  feedback: {
    helpful: Boolean,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  },
  conversationId: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index for PDF reference
ChatSchema.index({ pdfId: 1 });

// Index for timestamp
ChatSchema.index({ timestamp: -1 });

// Index for user session
ChatSchema.index({ userSession: 1 });

// Index for conversation
ChatSchema.index({ conversationId: 1 });

// Index for feedback
ChatSchema.index({ 'feedback.helpful': 1 });

module.exports = mongoose.model('Chat', ChatSchema);
