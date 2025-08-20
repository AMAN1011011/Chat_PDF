const Anthropic = require('@anthropic-ai/sdk');
const { CohereClient } = require('cohere-ai');

class EmbeddingService {
  constructor() {
    this.embeddings = null;
    this.modelName = null;
    this.initializeEmbeddings();
  }

  initializeEmbeddings() {
    // Priority order: Cohere > Anthropic (with TF-IDF fallback)
    if (process.env.COHERE_API_KEY) {
      this.cohere = new CohereClient({
        token: process.env.COHERE_API_KEY
      });
      this.embeddings = 'cohere';
      this.modelName = 'cohere';
      console.log('Using Cohere embeddings');
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      this.embeddings = 'anthropic';
      this.modelName = 'anthropic';
      console.log('Using Anthropic with TF-IDF fallback embeddings');
    } else {
      console.warn('No embedding API key found. Using fallback similarity search.');
      this.embeddings = null;
      this.modelName = 'fallback';
    }
  }

  // Generate embeddings for text chunks
  async generateEmbeddings(texts) {
    if (!this.embeddings) {
      return this.generateFallbackEmbeddings(texts);
    }

    try {
      let embeddings;
      
      if (this.embeddings === 'cohere') {
        const response = await this.cohere.embed({
          texts: texts,
          model: 'embed-english-v3.0',
          inputType: 'search_document'
        });
        embeddings = response.embeddings;
      } else if (this.embeddings === 'anthropic') {
        // Anthropic doesn't have a direct embedding API, so we'll use fallback
        return this.generateFallbackEmbeddings(texts);
      }

      return texts.map((text, index) => ({
        text,
        embedding: embeddings[index],
        model: this.modelName
      }));

    } catch (error) {
      console.error('Error generating embeddings:', error);
      return this.generateFallbackEmbeddings(texts);
    }
  }

  // Fallback embedding using TF-IDF and cosine similarity
  generateFallbackEmbeddings(texts) {
    const tfidf = this.calculateTFIDF(texts);
    return texts.map((text, index) => ({
      text,
      embedding: tfidf[index],
      model: 'fallback'
    }));
  }

  // Calculate TF-IDF vectors for fallback similarity
  calculateTFIDF(texts) {
    const documents = texts.map(text => 
      text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );

    const vocabulary = new Set();
    documents.forEach(doc => doc.forEach(word => vocabulary.add(word)));
    const vocabArray = Array.from(vocabulary);

    // Calculate TF
    const tf = documents.map(doc => {
      const tfVector = {};
      doc.forEach(word => {
        tfVector[word] = (tfVector[word] || 0) + 1;
      });
      return tfVector;
    });

    // Calculate IDF
    const idf = {};
    vocabArray.forEach(word => {
      const docsWithWord = documents.filter(doc => doc.includes(word)).length;
      idf[word] = Math.log(documents.length / docsWithWord);
    });

    // Calculate TF-IDF vectors
    return tf.map(tfVector => {
      return vocabArray.map(word => {
        const tfValue = tfVector[word] || 0;
        return tfValue * idf[word];
      });
    });
  }

  // Calculate cosine similarity between two vectors
  calculateCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Find similar chunks using embeddings
  async findSimilarChunks(query, chunks, topK = 5, threshold = 0.3) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbeddings([query]);
      
      if (!queryEmbedding[0]) {
        throw new Error('Failed to generate query embedding');
      }

      const queryVector = queryEmbedding[0].embedding;
      const similarities = [];

      // Calculate similarity with each chunk
      for (const chunk of chunks) {
        if (chunk.embedding && chunk.embedding.length > 0) {
          const similarity = this.calculateCosineSimilarity(queryVector, chunk.embedding);
          similarities.push({
            chunk,
            similarity,
            relevance: this.calculateRelevanceScore(similarity, chunk)
          });
        }
      }

      // Sort by similarity and filter by threshold
      const filteredResults = similarities
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return {
        results: filteredResults,
        totalChunks: chunks.length,
        chunksWithEmbeddings: similarities.length,
        averageSimilarity: similarities.length > 0 
          ? similarities.reduce((sum, r) => sum + r.similarity, 0) / similarities.length 
          : 0
      };

    } catch (error) {
      console.error('Error in similarity search:', error);
      return this.fallbackSimilaritySearch(query, chunks, topK);
    }
  }

  // Fallback similarity search using keyword matching
  fallbackSimilaritySearch(query, chunks, topK = 5) {
    const queryWords = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const similarities = chunks.map(chunk => {
      const chunkWords = chunk.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);

      const commonWords = queryWords.filter(word => chunkWords.includes(word));
      const similarity = commonWords.length / Math.max(queryWords.length, chunkWords.length);
      
      return {
        chunk,
        similarity,
        relevance: this.calculateRelevanceScore(similarity, chunk),
        commonWords
      };
    });

    return {
      results: similarities
        .filter(result => result.similarity > 0.01) // Lower threshold to be more inclusive
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK),
      totalChunks: chunks.length,
      chunksWithEmbeddings: chunks.length,
      averageSimilarity: similarities.reduce((sum, r) => sum + r.similarity, 0) / similarities.length,
      method: 'fallback'
    };
  }

  // Calculate relevance score based on similarity and chunk quality
  calculateRelevanceScore(similarity, chunk) {
    const baseScore = similarity;
    const lengthBonus = Math.min(chunk.content.length / 1000, 0.2); // Bonus for longer chunks
    const wordCountBonus = Math.min(chunk.wordCount / 100, 0.1); // Bonus for word count
    
    return Math.min(baseScore + lengthBonus + wordCountBonus, 1.0);
  }

  // Batch process embeddings for better performance
  async batchProcessEmbeddings(chunks, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const embeddings = await this.generateEmbeddings(texts);
        
        batch.forEach((chunk, index) => {
          if (embeddings[index]) {
            results.push({
              ...chunk,
              embedding: embeddings[index].embedding,
              embeddingModel: embeddings[index].model
            });
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        // Continue with next batch
      }
    }

    return results;
  }
}

module.exports = EmbeddingService;
