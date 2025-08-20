const express = require('express');
const { v4: uuidv4 } = require('uuid');
const PDF = require('../models/PDF');
const Chat = require('../models/Chat');
const EmbeddingService = require('../services/embeddingService');
const LLMService = require('../services/llmService');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chat routes are working' });
});

// Ask question about PDF content using RAG
router.post('/question', async (req, res) => {
  try {
    const { pdfId, question, conversationId } = req.body;

    if (!pdfId || !question) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'pdfId and question are required' 
      });
    }

    // Validate PDF exists and is processed
    const pdfDoc = await PDF.findById(pdfId);
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (pdfDoc.processingStatus !== 'completed') {
      return res.status(400).json({ 
        error: 'PDF not ready', 
        message: `PDF is still ${pdfDoc.processingStatus}. Please wait for processing to complete.` 
      });
    }

    const startTime = Date.now();
    const sessionId = conversationId || uuidv4();

    // Initialize services
    const embeddingService = new EmbeddingService();
    const llmService = new LLMService();

    // Find similar chunks using RAG
    const similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7;
    const topK = 5; // Number of chunks to retrieve

    const similarityResult = await embeddingService.findSimilarChunks(
      question, 
      pdfDoc.textChunks, 
      topK, 
      similarityThreshold
    );

    // Generate response using LLM or fallback
    const response = await llmService.generateRAGResponse(
      question,
      similarityResult.results.map(result => result.chunk),
      {
        filename: pdfDoc.originalName,
        pageCount: pdfDoc.pageCount
      }
    );

    const processingTime = Date.now() - startTime;

    // Save chat interaction
    const chatRecord = new Chat({
      pdfId: pdfDoc._id,
      question,
      answer: response.answer,
      context: {
        retrievedChunks: similarityResult.results.map(result => ({
          chunkId: result.chunk.chunkId,
          content: result.chunk.content,
          pageNumber: result.chunk.pageNumber,
          similarity: result.similarity,
          relevance: result.relevance
        })),
        totalChunksRetrieved: similarityResult.results.length,
        averageSimilarity: similarityResult.averageSimilarity
      },
      metadata: {
        questionTokens: question.split(' ').length,
        answerTokens: response.answer.split(' ').length,
        processingTime,
        modelUsed: response.model,
        temperature: 0.1,
        maxTokens: parseInt(process.env.MAX_TOKENS) || 4000
      },
      userSession: sessionId,
      conversationId: sessionId
    });

    await chatRecord.save();

    // Return response with metadata
    res.json({
      success: true,
      answer: response.answer,
      conversationId: sessionId,
      metadata: {
        model: response.model,
        processingTime,
        totalChunks: pdfDoc.textChunks.length,
        chunksRetrieved: similarityResult.results.length,
        averageSimilarity: similarityResult.averageSimilarity,
        similarityThreshold,
        pdfInfo: {
          id: pdfDoc._id,
          filename: pdfDoc.originalName,
          pageCount: pdfDoc.pageCount
        }
      },
      context: response.context
    });

  } catch (error) {
    console.error('Chat question error:', error);
    res.status(500).json({ 
      error: 'Failed to process question', 
      message: error.message 
    });
  }
});

// Get chat history for a PDF
router.get('/history/:pdfId', async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Validate PDF exists
    const pdfDoc = await PDF.findById(pdfId);
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Get chat history
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const chats = await Chat.find({ pdfId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const totalChats = await Chat.countDocuments({ pdfId });

    res.json({
      pdfId,
      filename: pdfDoc.originalName,
      totalChats,
      returnedChats: chats.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalChats / parseInt(limit)),
      chats: chats.map(chat => ({
        id: chat._id,
        question: chat.question,
        answer: chat.answer,
        timestamp: chat.timestamp,
        conversationId: chat.conversationId,
        metadata: chat.metadata,
        context: {
          chunksRetrieved: chat.context.totalChunksRetrieved,
          averageSimilarity: chat.context.averageSimilarity
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get conversation history
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;

    const chats = await Chat.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .populate('pdfId', 'originalName pageCount')
      .select('-__v');

    if (chats.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversationId,
      pdfInfo: {
        id: chats[0].pdfId._id,
        filename: chats[0].pdfId.originalName,
        pageCount: chats[0].pdfId.pageCount
      },
      totalMessages: chats.length,
      messages: chats.map(chat => ({
        id: chat._id,
        question: chat.question,
        answer: chat.answer,
        timestamp: chat.timestamp,
        metadata: chat.metadata,
        context: {
          chunksRetrieved: chat.context.totalChunksRetrieved,
          averageSimilarity: chat.context.averageSimilarity
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get chat analytics for a PDF
router.get('/analytics/:pdfId', async (req, res) => {
  try {
    const { pdfId } = req.params;

    // Validate PDF exists
    const pdfDoc = await PDF.findById(pdfId);
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Get chat statistics
    const totalQuestions = await Chat.countDocuments({ pdfId });
    const totalConversations = await Chat.distinct('conversationId', { pdfId }).countDocuments();
    
    // Get average processing time
    const avgProcessingTime = await Chat.aggregate([
      { $match: { pdfId: pdfDoc._id } },
      { $group: { _id: null, avgTime: { $avg: '$metadata.processingTime' } } }
    ]);

    // Get model usage statistics
    const modelUsage = await Chat.aggregate([
      { $match: { pdfId: pdfDoc._id } },
      { $group: { _id: '$metadata.modelUsed', count: { $sum: 1 } } }
    ]);

    // Get similarity score distribution
    const similarityStats = await Chat.aggregate([
      { $match: { pdfId: pdfDoc._id } },
      { $group: { 
        _id: null, 
        avgSimilarity: { $avg: '$context.averageSimilarity' },
        minSimilarity: { $min: '$context.averageSimilarity' },
        maxSimilarity: { $max: '$context.averageSimilarity' }
      } }
    ]);

    res.json({
      pdfId,
      filename: pdfDoc.originalName,
      analytics: {
        totalQuestions,
        totalConversations,
        averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
        modelUsage: modelUsage.reduce((acc, model) => {
          acc[model._id] = model.count;
          return acc;
        }, {}),
        similarityStats: similarityStats[0] || {
          avgSimilarity: 0,
          minSimilarity: 0,
          maxSimilarity: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chat analytics:', error);
    res.status(500).json({ error: 'Failed to fetch chat analytics' });
  }
});

// Provide feedback on chat response
router.post('/feedback/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { helpful, rating, comment } = req.body;

    if (helpful === undefined || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'helpful and rating are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Invalid rating', 
        message: 'Rating must be between 1 and 5' 
      });
    }

    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        feedback: {
          helpful: Boolean(helpful),
          rating: parseInt(rating),
          comment: comment || ''
        }
      },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: chat.feedback
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get system status and capabilities
router.get('/status', async (req, res) => {
  try {
    const embeddingService = new EmbeddingService();
    const llmService = new LLMService();

    res.json({
      status: 'OK',
      services: {
        embedding: {
          model: embeddingService.modelName,
          available: embeddingService.embeddings !== null,
          features: ['similarity_search', 'cosine_similarity', 'tfidf_fallback']
        },
        llm: llmService.getModelInfo()
      },
      configuration: {
        chunkSize: process.env.CHUNK_SIZE || 1000,
        chunkOverlap: process.env.CHUNK_OVERLAP || 200,
        maxTokens: process.env.MAX_TOKENS || 4000,
        similarityThreshold: process.env.SIMILARITY_THRESHOLD || 0.7
      }
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

module.exports = router;
