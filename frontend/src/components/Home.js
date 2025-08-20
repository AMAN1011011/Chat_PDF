import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, MessageCircle, Plus, Loader2, AlertCircle } from 'lucide-react';
import PDFStatus from './PDFStatus';

const Home = () => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      setLoading(true);
      // For now, we'll simulate fetching PDFs since we don't have a list endpoint
      // In a real app, you'd have an endpoint like /api/pdf/list
      setPdfs([]); // Empty for now, will be populated when PDFs are uploaded
    } catch (err) {
      setError('Failed to load PDFs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPDFs = () => {
    fetchPDFs();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI-Powered PDF Analysis
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload your PDF documents and chat with them using advanced AI. 
          Get intelligent answers, summaries, and insights from your documents.
        </p>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Upload New PDF */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center hover:shadow-xl transition-shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Upload New PDF
          </h3>
          <p className="text-gray-600 mb-6">
            Upload a PDF document (up to 500 pages) and let our AI process it for intelligent analysis.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Upload
          </Link>
        </div>

        {/* Chat with Existing PDFs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center hover:shadow-xl transition-shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Chat with PDFs
          </h3>
          <p className="text-gray-600 mb-6">
            Ask questions about your uploaded documents and get AI-powered answers based on the content.
          </p>
          <div className="text-sm text-gray-500">
            Upload a PDF first to start chatting
          </div>
        </div>
      </div>

      {/* PDFs Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
          <button
            onClick={refreshPDFs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Loader2 className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your documents...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No PDFs uploaded yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start by uploading your first PDF document to begin analyzing it with AI.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First PDF
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pdfs.map((pdf) => (
              <PDFStatus key={pdf.id} pdfId={pdf.id} />
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 font-bold text-lg">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload PDF</h3>
            <p className="text-gray-600">
              Upload your PDF document (up to 500 pages) through our secure interface.
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 font-bold text-lg">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Processing</h3>
            <p className="text-gray-600">
              Our AI automatically extracts text, creates intelligent chunks, and generates embeddings.
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 font-bold text-lg">3</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat & Analyze</h3>
            <p className="text-gray-600">
              Ask questions and get intelligent, context-aware answers based on your document content.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Powered by advanced RAG (Retrieval-Augmented Generation) technology with support for 
          Anthropic Claude and Cohere Command AI models.
        </p>
      </div>
    </div>
  );
};

export default Home;
