# PDF Chat Application

An AI-powered web application that allows users to upload PDF documents and ask questions about their content. The system uses Retrieval-Augmented Generation (RAG) to provide intelligent, context-aware answers based on the uploaded documents.

## Features

- **PDF Upload & Processing**: Upload PDF documents up to 500 pages
- **Intelligent Text Chunking**: Smart text segmentation with configurable overlap
- **RAG-based Q&A**: Retrieval-Augmented Generation for accurate answers
- **Multiple LLM Support**: Integration with Anthropic Claude, and Ollama
- **Embedding Generation**: Vector embeddings for semantic similarity search
- **Chat History**: Persistent conversation tracking and analytics
- **Modern UI**: React-based frontend with Tailwind CSS


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

## ScreenShots
![Uploaded Screenshot](https://useful-olive-lhtgbnlyq6.edgeone.app/Screenshot%202025-08-21%20102614.png)
![Uploaded Screenshot](https://new-aquamarine-ot3rdimuma.edgeone.app/Screenshot%202025-08-21%20102652.png)





## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue in the repository.
