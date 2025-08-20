const mongoose = require('mongoose');

const PDFSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    default: 'application/pdf'
  },
  extractedText: {
    type: String,
    required: true
  },
  textChunks: [{
    content: String,
    pageNumber: Number,
    chunkIndex: Number,
    chunkId: String,
    startChar: Number,
    endChar: Number,
    wordCount: Number
  }],
  embeddings: [{
    chunkId: String,
    embedding: [Number],
    model: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  pageCount: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  processingStatus: {
    type: String,
    enum: ['uploading', 'processing', 'chunking', 'embedding', 'completed', 'failed'],
    default: 'uploading'
  },
  processingMetadata: {
    totalChunks: Number,
    totalTokens: Number,
    processingTime: Number,
    embeddingModel: String,
    chunkSize: Number,
    chunkOverlap: Number
  },
  errorMessage: {
    type: String,
    default: null
  },
  tags: [String],
  summary: String,
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

// Index for text search
PDFSchema.index({ extractedText: 'text' });

// Index for filename search
PDFSchema.index({ filename: 1 });

// Index for upload date
PDFSchema.index({ uploadDate: -1 });

// Index for processing status
PDFSchema.index({ processingStatus: 1 });

// Index for tags
PDFSchema.index({ tags: 1 });

// Index for language
PDFSchema.index({ language: 1 });

module.exports = mongoose.model('PDF', PDFSchema);
