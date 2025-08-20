const Anthropic = require('@anthropic-ai/sdk');
const { CohereClient } = require('cohere-ai');

class LLMService {
  constructor() {
    this.llm = null;
    this.modelName = null;
    this.initializeLLM();
  }

  initializeLLM() {
    // Priority order: Anthropic > Cohere
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      this.llm = 'anthropic';
      this.modelName = 'anthropic';
      console.log('Using Anthropic Claude LLM');
    } else if (process.env.COHERE_API_KEY) {
      this.cohere = new CohereClient({
        token: process.env.COHERE_API_KEY
      });
      this.llm = 'cohere';
      this.modelName = 'cohere';
      console.log('Using Cohere Command LLM');
    } else {
      console.warn('No LLM API key found. Using fallback response generation.');
      this.llm = null;
      this.modelName = 'fallback';
    }
  }

  // Generate RAG-based response using retrieved context
  async generateRAGResponse(question, retrievedChunks, pdfMetadata = {}) {
    if (!this.llm) {
      return this.generateFallbackResponse(question, retrievedChunks, pdfMetadata);
    }

    try {
      const context = this.buildContextString(retrievedChunks);
      const prompt = this.buildRAGPrompt(question, context, pdfMetadata);
      
      let response;
      
      if (this.llm === 'anthropic') {
        const message = await this.anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          max_tokens: parseInt(process.env.MAX_TOKENS) || 4000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        response = { content: message.content[0].text };
      } else if (this.llm === 'cohere') {
        const cohereResponse = await this.cohere.generate({
          model: process.env.COHERE_MODEL || 'command',
          prompt: prompt,
          maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
          temperature: 0.1
        });
        response = { content: cohereResponse.generations[0].text };
      }

      return {
        answer: response.content,
        model: this.modelName,
        context: {
          retrievedChunks: retrievedChunks.map(chunk => ({
            chunkId: chunk.chunkId,
            content: chunk.content.substring(0, 200) + '...',
            pageNumber: chunk.pageNumber,
            similarity: chunk.similarity,
            relevance: chunk.relevance
          })),
          totalChunksRetrieved: retrievedChunks.length,
          averageSimilarity: retrievedChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / retrievedChunks.length
        }
      };

    } catch (error) {
      console.error('Error generating LLM response:', error);
      return this.generateFallbackResponse(question, retrievedChunks, pdfMetadata);
    }
  }

  // Build context string from retrieved chunks
  buildContextString(chunks) {
    return chunks
      .map((chunk, index) => {
        return `[Context ${index + 1} - Page ${chunk.pageNumber}]\n${chunk.content}\n`;
      })
      .join('\n');
  }

  // Build RAG prompt with context
  buildRAGPrompt(question, context, pdfMetadata) {
    const metadataInfo = pdfMetadata.filename ? 
      `\nDocument: ${pdfMetadata.filename} (${pdfMetadata.pageCount} pages)` : '';

    return `Based on the following context from a PDF document, please answer the user's question accurately and comprehensively.

${metadataInfo}

Context Information:
${context}

User Question: ${question}

Instructions:
1. Answer based ONLY on the provided context
2. If the context doesn't contain enough information, say so clearly
3. Cite specific page numbers when referencing information
4. Provide a clear, well-structured response
5. If the question is unclear, ask for clarification

Answer:`;
  }

  // Get system prompt for the LLM
  getSystemPrompt() {
    return `You are an intelligent AI assistant specialized in analyzing PDF documents and answering questions based on their content. 

Your capabilities:
- Analyze and understand complex document content
- Provide accurate, context-aware answers
- Cite specific sources and page numbers
- Handle technical and academic content
- Maintain professional and helpful tone

Guidelines:
- Always base your answers on the provided context
- Be precise and avoid speculation
- Use clear, structured responses
- Acknowledge limitations when context is insufficient
- Provide helpful suggestions when appropriate`;
  }

  // Fallback response generation without external LLM
  generateFallbackResponse(question, retrievedChunks, pdfMetadata) {
    if (retrievedChunks.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the document to answer your question. Please try rephrasing your question or check if the document contains the information you're looking for.",
        model: 'fallback',
        context: {
          retrievedChunks: [],
          totalChunksRetrieved: 0,
          averageSimilarity: 0
        }
      };
    }

    // Lower the similarity threshold for fallback to be more inclusive
    const relevantChunks = retrievedChunks
      .filter(chunk => (chunk.similarity || 0) > 0.1) // Lowered from 0.5 to 0.1
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    if (relevantChunks.length === 0) {
      // Even if similarity is low, try to provide some context
      const bestChunks = retrievedChunks
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, 2);
      
      const contextInfo = bestChunks.map(chunk => 
        `Page ${chunk.pageNumber}: "${chunk.content.substring(0, 150)}..."`
      ).join('\n\n');
      
      return {
        answer: `While I couldn't find highly relevant information, here's what I found in the document that might be related:\n\n${contextInfo}\n\nTry asking more specific questions or rephrasing your query. You can also ask about specific topics, page numbers, or content sections.`,
        model: 'fallback',
        context: {
          retrievedChunks: bestChunks.map(chunk => ({
            chunkId: chunk.chunkId,
            content: chunk.content.substring(0, 200) + '...',
            pageNumber: chunk.pageNumber,
            similarity: chunk.similarity || 0,
            relevance: chunk.relevance || 0
          })),
          totalChunksRetrieved: bestChunks.length,
          averageSimilarity: bestChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / bestChunks.length
        }
      };
    }

    // Generate a comprehensive response from relevant chunks
    const topChunks = relevantChunks.slice(0, 3); // Use top 3 chunks
    let answer = `Based on the relevant content I found, here's what I can tell you:\n\n`;
    
    topChunks.forEach((chunk, index) => {
      const summary = this.generateChunkSummary(chunk.content, 200);
      answer += `${index + 1}. **Page ${chunk.pageNumber}** (Relevance: ${((chunk.relevance || 0) * 100).toFixed(1)}%):\n${summary}\n\n`;
    });
    
    if (relevantChunks.length > 3) {
      answer += `*Note: I found ${relevantChunks.length} relevant sections. For more details, try asking about specific topics or page numbers.*`;
    }
    
    return {
      answer,
      model: 'fallback',
      context: {
        retrievedChunks: relevantChunks.map(chunk => ({
          chunkId: chunk.chunkId,
          content: chunk.content.substring(0, 200) + '...',
          pageNumber: chunk.pageNumber,
          similarity: chunk.similarity || 0,
          relevance: chunk.relevance || 0
        })),
        totalChunksRetrieved: relevantChunks.length,
        averageSimilarity: relevantChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / relevantChunks.length
      }
    };
  }

  // Generate summary from chunk content
  generateChunkSummary(content, maxLength = 300) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    let summary = '';
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }

    return summary || content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Generate document summary
  async generateDocumentSummary(chunks, pdfMetadata) {
    if (!this.llm) {
      return this.generateFallbackSummary(chunks, pdfMetadata);
    }

    try {
      const content = chunks.map(chunk => chunk.content).join('\n\n');
      const prompt = `Please provide a comprehensive summary of the following document content. Focus on the main topics, key findings, and important information.

Document: ${pdfMetadata.filename || 'Unknown'}
Pages: ${pdfMetadata.pageCount || 'Unknown'}

Content:
${content.substring(0, 8000)}${content.length > 8000 ? '...' : ''}

Please provide a structured summary with:
1. Main topics/themes
2. Key findings or conclusions
3. Important details
4. Overall document purpose

Summary:`;

      let response;
      
      if (this.llm === 'anthropic') {
        const message = await this.anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          max_tokens: parseInt(process.env.MAX_TOKENS) || 4000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        response = { content: message.content[0].text };
      } else if (this.llm === 'cohere') {
        const cohereResponse = await this.cohere.generate({
          model: process.env.COHERE_MODEL || 'command',
          prompt: prompt,
          maxTokens: parseInt(process.env.MAX_TOKENS) || 4000,
          temperature: 0.1
        });
        response = { content: cohereResponse.generations[0].text };
      }

      return {
        summary: response.content,
        model: this.modelName,
        totalChunks: chunks.length
      };

    } catch (error) {
      console.error('Error generating document summary:', error);
      return this.generateFallbackSummary(chunks, pdfMetadata);
    }
  }

  // Fallback summary generation
  generateFallbackSummary(chunks, pdfMetadata) {
    const keyPhrases = this.extractKeyPhrases(chunks);
    const summary = `This document contains ${chunks.length} text chunks across ${pdfMetadata.pageCount || 'unknown'} pages. 

Key topics identified: ${keyPhrases.slice(0, 5).map(phrase => phrase.word).join(', ')}

The document appears to cover various subjects with an average chunk size of ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length)} characters.`;

    return {
      summary,
      model: 'fallback',
      totalChunks: chunks.length
    };
  }

  // Extract key phrases from chunks
  extractKeyPhrases(chunks, maxPhrases = 10) {
    const wordFreq = {};
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);

    chunks.forEach(chunk => {
      const words = chunk.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxPhrases)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  // Check if LLM is available
  isAvailable() {
    return this.llm !== null;
  }

  // Get current model information
  getModelInfo() {
    return {
      model: this.modelName,
      available: this.isAvailable(),
      features: this.isAvailable() ? ['rag', 'summarization', 'qa'] : ['fallback', 'basic_qa']
    };
  }
}

module.exports = LLMService;
