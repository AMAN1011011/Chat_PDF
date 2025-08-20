const natural = require('natural');
const stopwords = require('stopwords').english;

class TextProcessor {
  constructor(chunkSize = 1000, chunkOverlap = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.tokenizer = new natural.WordTokenizer();
  }

  // Clean and preprocess text
  preprocessText(text) {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .trim();
  }

  // Split text into sentences for better chunking
  splitIntoSentences(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map(s => s.trim()).filter(s => s.length > 10);
  }

  // Create overlapping chunks with smart boundaries
  createChunks(text, pageNumber = 1) {
    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length <= this.chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            pageNumber,
            chunkIndex: chunkIndex++,
            chunkId: `${pageNumber}_${chunkIndex}`,
            startChar,
            endChar: startChar + currentChunk.length,
            wordCount: this.tokenizer.tokenize(currentChunk).length
          });
          startChar += currentChunk.length + 1;
        }
        
        // Start new chunk with overlap
        if (this.chunkOverlap > 0 && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const overlapText = lastChunk.content.slice(-this.chunkOverlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        pageNumber,
        chunkIndex: chunkIndex,
        chunkId: `${pageNumber}_${chunkIndex}`,
        startChar,
        endChar: startChar + currentChunk.length,
        wordCount: this.tokenizer.tokenize(currentChunk).length
      });
    }

    return chunks;
  }

  // Process multi-page PDF text
  processPDFText(text, pageCount) {
    const pages = text.split(/\f/); // Form feed character for page breaks
    const allChunks = [];
    
    for (let i = 0; i < pages.length; i++) {
      const pageText = this.preprocessText(pages[i]);
      if (pageText.trim()) {
        const pageChunks = this.createChunks(pageText, i + 1);
        allChunks.push(...pageChunks);
      }
    }

    return {
      chunks: allChunks,
      totalChunks: allChunks.length,
      totalWords: allChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0),
      averageChunkSize: allChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / allChunks.length
    };
  }

  // Extract key phrases and topics from text
  extractKeyPhrases(text, maxPhrases = 10) {
    const words = this.tokenizer.tokenize(text.toLowerCase());
    const filteredWords = words.filter(word => 
      word.length > 3 && 
      !stopwords.includes(word) && 
      !/^\d+$/.test(word)
    );
    
    const wordFreq = {};
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxPhrases)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  // Detect language (basic implementation)
  detectLanguage(text) {
    const englishPattern = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const spanishPattern = /\b(el|la|los|las|y|o|pero|en|con|por|para|de|del)\b/gi;
    const frenchPattern = /\b(le|la|les|et|ou|mais|en|avec|par|pour|de|du)\b/gi;

    const englishMatches = (text.match(englishPattern) || []).length;
    const spanishMatches = (text.match(spanishPattern) || []).length;
    const frenchMatches = (text.match(frenchPattern) || []).length;

    if (englishMatches > spanishMatches && englishMatches > frenchMatches) return 'en';
    if (spanishMatches > englishMatches && spanishMatches > frenchMatches) return 'es';
    if (frenchMatches > englishMatches && frenchMatches > spanishMatches) return 'fr';
    
    return 'en'; // Default to English
  }

  // Generate summary from chunks
  generateSummary(chunks, maxLength = 500) {
    const allText = chunks.map(chunk => chunk.content).join(' ');
    const sentences = this.splitIntoSentences(allText);
    
    // Simple extractive summarization
    const sentenceScores = sentences.map(sentence => {
      const words = this.tokenizer.tokenize(sentence.toLowerCase());
      const keyWords = words.filter(word => 
        word.length > 4 && !stopwords.includes(word)
      );
      return {
        sentence,
        score: keyWords.length,
        length: sentence.length
      };
    });

    // Sort by score and length
    sentenceScores.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.length - b.length;
    });

    let summary = '';
    for (const item of sentenceScores) {
      if ((summary + ' ' + item.sentence).length <= maxLength) {
        summary += (summary ? ' ' : '') + item.sentence;
      } else {
        break;
      }
    }

    return summary;
  }
}

module.exports = TextProcessor;
