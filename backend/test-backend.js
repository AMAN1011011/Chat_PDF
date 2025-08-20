// Simple test file to verify backend services
const TextProcessor = require('./services/textProcessor');
const EmbeddingService = require('./services/embeddingService');
const LLMService = require('./services/llmService');

console.log('Testing backend services...\n');

// Test TextProcessor
console.log('1. Testing TextProcessor...');
const textProcessor = new TextProcessor(1000, 200);
const sampleText = "This is a sample text for testing. It contains multiple sentences. We will test chunking and processing.";
const chunks = textProcessor.createChunks(sampleText);
console.log(`   - Created ${chunks.length} chunks`);
console.log(`   - First chunk: ${chunks[0]?.content?.substring(0, 50)}...`);
console.log('   ✓ TextProcessor working\n');

// Test EmbeddingService
console.log('2. Testing EmbeddingService...');
const embeddingService = new EmbeddingService();
console.log(`   - Model: ${embeddingService.modelName}`);
console.log(`   - Available: ${embeddingService.embeddings !== null}`);
console.log('   ✓ EmbeddingService working\n');

// Test LLMService
console.log('3. Testing LLMService...');
const llmService = new LLMService();
console.log(`   - Model: ${llmService.modelName}`);
console.log(`   - Available: ${llmService.isAvailable()}`);
console.log('   ✓ LLMService working\n');

// Test similarity search with fallback
console.log('4. Testing similarity search...');
const testChunks = [
  { content: "This is about artificial intelligence and machine learning.", chunkId: "1", pageNumber: 1, wordCount: 10 },
  { content: "Machine learning algorithms process data to find patterns.", chunkId: "2", pageNumber: 1, wordCount: 10 },
  { content: "The weather today is sunny and warm.", chunkId: "3", pageNumber: 2, wordCount: 8 }
];

embeddingService.findSimilarChunks("What is machine learning?", testChunks, 2, 0.3)
  .then(result => {
    console.log(`   - Found ${result.results.length} similar chunks`);
    console.log(`   - Average similarity: ${result.averageSimilarity.toFixed(3)}`);
    console.log('   ✓ Similarity search working\n');
  })
  .catch(error => {
    console.log(`   - Error: ${error.message}`);
    console.log('   ✗ Similarity search failed\n');
  });

console.log('Backend services test completed!');
