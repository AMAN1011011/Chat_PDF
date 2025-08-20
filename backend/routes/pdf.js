const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const PDF = require('../models/PDF');
const TextProcessor = require('../services/textProcessor');
const EmbeddingService = require('../services/embeddingService');
const LLMService = require('../services/llmService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'PDF routes are working' });
});

// Upload and process PDF
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const startTime = Date.now();
    const filePath = req.file.path;
    const fileSize = req.file.size;
    const originalName = req.file.originalname;

    // Read and parse PDF
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    
    const pageCount = pdfData.numpages;
    const extractedText = pdfData.text;

    // Check if document is too large (500+ pages)
    if (pageCount > 500) {
      await fs.unlink(filePath); // Clean up uploaded file
      return res.status(413).json({ 
        error: 'Document too large', 
        message: 'Maximum supported pages: 500. Your document has: ' + pageCount + ' pages.' 
      });
    }

    // Create PDF document record
    const pdfDoc = new PDF({
      filename: req.file.filename,
      originalName,
      fileSize,
      mimeType: req.file.mimetype,
      extractedText,
      pageCount,
      processingStatus: 'processing'
    });

    await pdfDoc.save();

    // Process text in background
    processPDFInBackground(pdfDoc._id, extractedText, pageCount, filePath);

    res.json({
      success: true,
      message: 'PDF uploaded successfully and processing started',
      pdfId: pdfDoc._id,
      filename: originalName,
      pageCount,
      fileSize,
      status: 'processing'
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'PDF processing failed', 
      message: error.message 
    });
  }
});

// Get PDF information
router.get('/:id', async (req, res) => {
  try {
    const pdfDoc = await PDF.findById(req.params.id);
    
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.json({
      id: pdfDoc._id,
      filename: pdfDoc.originalName,
      fileSize: pdfDoc.fileSize,
      pageCount: pdfDoc.pageCount,
      processingStatus: pdfDoc.processingStatus,
      uploadDate: pdfDoc.uploadDate,
      totalChunks: pdfDoc.textChunks.length,
      summary: pdfDoc.summary,
      tags: pdfDoc.tags,
      language: pdfDoc.language,
      processingMetadata: pdfDoc.processingMetadata
    });

  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ error: 'Failed to fetch PDF information' });
  }
});

// Get PDF chunks for analysis
router.get('/:id/chunks', async (req, res) => {
  try {
    const pdfDoc = await PDF.findById(req.params.id);
    
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (pdfDoc.processingStatus !== 'completed') {
      return res.status(400).json({ 
        error: 'PDF processing not complete', 
        status: pdfDoc.processingStatus 
      });
    }

    const { page, limit = 20 } = req.query;
    let chunks = pdfDoc.textChunks;

    if (page) {
      chunks = chunks.filter(chunk => chunk.pageNumber === parseInt(page));
    }

    chunks = chunks.slice(0, parseInt(limit));

    res.json({
      pdfId: pdfDoc._id,
      totalChunks: pdfDoc.textChunks.length,
      returnedChunks: chunks.length,
      chunks: chunks.map(chunk => ({
        chunkId: chunk.chunkId,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        wordCount: chunk.wordCount,
        startChar: chunk.startChar,
        endChar: chunk.endChar
      }))
    });

  } catch (error) {
    console.error('Error fetching PDF chunks:', error);
    res.status(500).json({ error: 'Failed to fetch PDF chunks' });
  }
});

// Get PDF summary
router.get('/:id/summary', async (req, res) => {
  try {
    const pdfDoc = await PDF.findById(req.params.id);
    
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (pdfDoc.processingStatus !== 'completed') {
      return res.status(400).json({ 
        error: 'PDF processing not complete', 
        status: pdfDoc.processingStatus 
      });
    }

    res.json({
      pdfId: pdfDoc._id,
      filename: pdfDoc.originalName,
      summary: pdfDoc.summary,
      tags: pdfDoc.tags,
      language: pdfDoc.language,
      totalChunks: pdfDoc.textChunks.length,
      processingMetadata: pdfDoc.processingMetadata
    });

  } catch (error) {
    console.error('Error fetching PDF summary:', error);
    res.status(500).json({ error: 'Failed to fetch PDF summary' });
  }
});

// Delete PDF
router.delete('/:id', async (req, res) => {
  try {
    const pdfDoc = await PDF.findById(req.params.id);
    
    if (!pdfDoc) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete uploaded file
    try {
      await fs.unlink(`uploads/${pdfDoc.filename}`);
    } catch (unlinkError) {
      console.error('Error deleting file:', unlinkError);
    }

    // Delete from database
    await PDF.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'PDF deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: 'Failed to delete PDF' });
  }
});

// Background processing function
async function processPDFInBackground(pdfId, extractedText, pageCount, filePath) {
  try {
    console.log(`Starting background processing for PDF ${pdfId}`);
    
    const textProcessor = new TextProcessor(
      parseInt(process.env.CHUNK_SIZE) || 1000,
      parseInt(process.env.CHUNK_OVERLAP) || 200
    );
    console.log('TextProcessor initialized');

    // Update status to chunking
    await PDF.findByIdAndUpdate(pdfId, { processingStatus: 'chunking' });
    console.log('Status updated to chunking');

    // Process text into chunks
    const processingResult = textProcessor.processPDFText(extractedText, pageCount);
    console.log(`Text chunking completed: ${processingResult.chunks.length} chunks created`);
    
    // Update status to embedding
    await PDF.findByIdAndUpdate(pdfId, { 
      processingStatus: 'embedding',
      textChunks: processingResult.chunks
    });
    console.log('Status updated to embedding');

    // Generate embeddings
    const embeddingService = new EmbeddingService();
    console.log('EmbeddingService initialized');
    const chunksWithEmbeddings = await embeddingService.batchProcessEmbeddings(processingResult.chunks);
    console.log('Embeddings generated successfully');

    // Generate summary
    const llmService = new LLMService();
    console.log('LLMService initialized');
    const summaryResult = await llmService.generateDocumentSummary(
      chunksWithEmbeddings, 
      { filename: path.basename(filePath), pageCount }
    );
    console.log('Summary generated successfully');

    // Extract key phrases and detect language
    const keyPhrases = textProcessor.extractKeyPhrases(extractedText);
    const language = textProcessor.detectLanguage(extractedText);
    const tags = keyPhrases.slice(0, 8).map(phrase => phrase.word);
    console.log(`Key phrases and language detected: ${tags.length} tags, language: ${language}`);

    // Update final status
    await PDF.findByIdAndUpdate(pdfId, {
      processingStatus: 'completed',
      embeddings: chunksWithEmbeddings.map(chunk => ({
        chunkId: chunk.chunkId,
        embedding: chunk.embedding,
        model: chunk.embeddingModel || 'fallback'
      })),
      summary: summaryResult.summary,
      tags,
      language,
      processingMetadata: {
        totalChunks: processingResult.totalChunks,
        totalTokens: processingResult.totalWords,
        processingTime: Date.now() - Date.now(), // Will be calculated properly
        embeddingModel: embeddingService.modelName,
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 1000,
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200
      }
    });

    console.log(`PDF processing completed successfully for ${pdfId}`);

  } catch (error) {
    console.error('Background processing error:', error);
    console.error('Error stack:', error.stack);
    
    // Update status to failed
    await PDF.findByIdAndUpdate(pdfId, {
      processingStatus: 'failed',
      errorMessage: error.message
    });
  }
}

module.exports = router;
