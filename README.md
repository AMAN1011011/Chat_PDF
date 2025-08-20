# PDF Chat Application

An AI-powered web application that allows users to upload PDF documents and ask questions about their content. The system uses Retrieval-Augmented Generation (RAG) to provide intelligent, context-aware answers based on the uploaded documents.

## Features

- **PDF Upload & Processing**: Upload PDF documents up to 500 pages
- **Intelligent Text Chunking**: Smart text segmentation with configurable overlap
- **RAG-based Q&A**: Retrieval-Augmented Generation for accurate answers
- **Multiple LLM Support**: Integration with Anthropic Claude, Cohere Command, and OpenAI
- **Embedding Generation**: Vector embeddings for semantic similarity search
- **Fallback Mechanisms**: TF-IDF similarity when external APIs are unavailable
- **Chat History**: Persistent conversation tracking and analytics
- **Modern UI**: React-based frontend with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **PDF Processing**: pdf-parse library
- **Text Processing**: Natural language processing with natural.js
- **AI Integration**: Direct API calls to LLM providers
- **Security**: Helmet, CORS, Rate limiting

### Frontend
- **React.js** with React Router
- **Tailwind CSS** for styling
- **Axios** for API communication
- **Modern UI/UX** with responsive design

### AI & ML
- **RAG Architecture**: Retrieval-Augmented Generation
- **Embedding Models**: Cohere, OpenAI, TF-IDF fallback
- **LLM Providers**: Anthropic Claude, Cohere Command, OpenAI GPT-4
- **Similarity Search**: Cosine similarity with configurable thresholds

## Project Structure

```
Chat_PDF/
├── backend/                    # Backend Node.js application
│   ├── models/                # MongoDB schemas
│   │   ├── PDF.js            # PDF document model
│   │   └── Chat.js           # Chat conversation model
│   ├── routes/                # API endpoints
│   │   ├── pdf.js            # PDF upload and management
│   │   └── chat.js           # Chat and Q&A functionality
│   ├── services/              # Core business logic
│   │   ├── textProcessor.js   # Text chunking and processing
│   │   ├── embeddingService.js # Embedding generation and similarity
│   │   └── llmService.js      # LLM integration and RAG
│   ├── server.js              # Express server entry point
│   ├── package.json           # Backend dependencies
│   ├── env.example            # Environment variables template
│   └── test-backend.js        # Backend service tests
├── frontend/                   # React frontend application
│   ├── public/                # Static assets
│   ├── src/                   # React components and logic
│   │   ├── components/        # UI components
│   │   ├── App.js            # Main application component
│   │   └── index.js          # React entry point
│   ├── package.json           # Frontend dependencies
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── postcss.config.js      # PostCSS configuration
├── package.json                # Root project configuration
└── README.md                   # Project documentation
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- API keys for at least one LLM provider (Anthropic, Cohere, or OpenAI)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Chat_PDF
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   npm run install-backend
   
   # Install frontend dependencies
   npm run install-frontend
   ```

3. **Configure environment variables**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Backend only
   npm run server
   
   # Frontend only
   npm run client
   ```

## Environment Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pdf-chat-app

# Client URL for CORS
CLIENT_URL=http://localhost:3000

# LLM API Configuration (Choose one or multiple)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
COHERE_API_KEY=your_cohere_api_key_here

# RAG Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_TOKENS=4000
SIMILARITY_THRESHOLD=0.7
```

## Development Phases

### ✅ Phase 1: Project Setup & Basic Structure
- [x] MERN stack project initialization
- [x] Basic Express server setup
- [x] MongoDB connection and models
- [x] React frontend setup with routing

### ✅ Phase 2: Core RAG Infrastructure
- [x] Text processing and chunking service
- [x] Embedding generation service
- [x] LLM integration service
- [x] RAG-based question answering
- [x] API routes for PDF and chat functionality
- [x] Fallback mechanisms for offline operation

### 🔄 Phase 3: Frontend Development
- [ ] PDF upload component with drag & drop
- [ ] Chat interface with conversation history
- [ ] PDF viewer and chunk explorer
- [ ] Responsive design and modern UI
- [ ] Real-time processing status updates

### ⏳ Phase 4: Integration & Testing
- [ ] End-to-end testing
- [ ] Error handling and user feedback
- [ ] Performance optimization
- [ ] Security enhancements

### ⏳ Phase 5: Advanced Features
- [ ] Multi-document support
- [ ] Advanced analytics and insights
- [ ] Export and sharing capabilities
- [ ] User authentication and management

## API Endpoints

### PDF Management
- `POST /api/pdf/upload` - Upload and process PDF
- `GET /api/pdf/:id` - Get PDF information
- `GET /api/pdf/:id/chunks` - Get text chunks
- `GET /api/pdf/:id/summary` - Get document summary
- `DELETE /api/pdf/:id` - Delete PDF

### Chat & Q&A
- `POST /api/chat/question` - Ask question about PDF
- `GET /api/chat/history/:pdfId` - Get chat history
- `GET /api/chat/conversation/:conversationId` - Get conversation
- `GET /api/chat/analytics/:pdfId` - Get chat analytics
- `POST /api/chat/feedback/:chatId` - Submit feedback

## Testing

### Backend Services
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue in the repository.
