import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Send, FileText, AlertCircle, Loader2, RefreshCw, Info } from 'lucide-react';

const ChatInterface = () => {
  const { pdfId } = useParams();
  const [pdfInfo, setPdfInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('checking');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchPDFInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}`);
      if (!response.ok) {
        throw new Error('PDF not found');
      }
      const data = await response.json();
      setPdfInfo(data);
    } catch (err) {
      setError('Failed to load PDF information');
      console.error(err);
    }
  }, [pdfId]);

  const loadChatHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/history/${pdfId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.chats.map(chat => ({
          id: chat.id,
          type: 'user',
          content: chat.question,
          timestamp: new Date(chat.timestamp),
          metadata: chat.metadata
        })).concat(data.chats.map(chat => ({
          id: chat.id + '_response',
          type: 'ai',
          content: chat.answer,
          timestamp: new Date(chat.timestamp),
          metadata: chat.metadata,
          context: chat.context
        }))).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [pdfId]);

  const checkProcessingStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}`);
      if (!response.ok) {
        throw new Error('PDF not found');
      }
      const data = await response.json();
      setProcessingStatus(data.processingStatus);
      
      if (data.processingStatus === 'completed') {
        loadChatHistory();
      } else if (data.processingStatus === 'failed') {
        setError('PDF processing failed. Please try uploading again.');
      }
    } catch (err) {
      setError('Failed to check processing status');
      console.error(err);
    }
  }, [pdfId, loadChatHistory]);

  useEffect(() => {
    fetchPDFInfo();
    checkProcessingStatus();
  }, [fetchPDFInfo, checkProcessingStatus]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfId: pdfId,
          question: userMessage.content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.answer,
        timestamp: new Date(),
        metadata: data.metadata,
        context: data.context
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err.message || 'Failed to get AI response');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const retryProcessing = () => {
    setProcessingStatus('checking');
    checkProcessingStatus();
  };

  if (processingStatus === 'checking') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking PDF Status</h2>
        <p className="text-gray-600">Please wait while we verify your document...</p>
      </div>
    );
  }

  if (processingStatus === 'failed') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={retryProcessing}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upload New PDF
          </Link>
        </div>
      </div>
    );
  }

  if (processingStatus !== 'completed') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Your PDF</h2>
        <p className="text-gray-600 mb-4">
          Status: {processingStatus.charAt(0).toUpperCase() + processingStatus.slice(1)}
        </p>
        <p className="text-gray-500 text-sm">
          This may take a few minutes for large documents. You'll be able to chat once processing is complete.
        </p>
        <button
          onClick={checkProcessingStatus}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Check Status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Chat with PDF
                </h1>
                <p className="text-sm text-gray-500">
                  {pdfInfo?.filename} • {pdfInfo?.pageCount} pages
                </p>
              </div>
            </div>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Upload New PDF
            </Link>
          </div>
        </div>

        {/* Chat Area */}
        <div className="p-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500">
                Ask questions about your PDF document and get AI-powered answers
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.type === 'ai' && message.context && (
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Info className="h-3 w-3" />
                          <span>
                            {message.context.chunksRetrieved} chunks retrieved • 
                            {((message.context.averageSimilarity || 0) * 100).toFixed(1)}% relevance
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="flex items-center space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your PDF..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • AI responses are based on your PDF content
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
