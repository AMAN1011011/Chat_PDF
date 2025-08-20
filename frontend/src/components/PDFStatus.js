import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Loader2, RefreshCw, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const PDFStatus = ({ pdfId }) => {
  const [pdfInfo, setPdfInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPDFInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pdf/${pdfId}`);
      if (!response.ok) {
        throw new Error('PDF not found');
      }
      const data = await response.json();
      setPdfInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pdfId]);

  useEffect(() => {
    fetchPDFInfo();
  }, [fetchPDFInfo]);

  const refreshStatus = () => {
    fetchPDFInfo();
  };

  const deletePDF = async () => {
    if (!window.confirm('Are you sure you want to delete this PDF? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pdf/${pdfId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Redirect to home after successful deletion
        window.location.href = '/';
      } else {
        throw new Error('Failed to delete PDF');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading PDF information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!pdfInfo) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
      case 'chunking':
      case 'embedding':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
      case 'chunking':
      case 'embedding':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Processing Complete';
      case 'failed':
        return 'Processing Failed';
      case 'processing':
        return 'Processing PDF';
      case 'chunking':
        return 'Creating Text Chunks';
      case 'embedding':
        return 'Generating Embeddings';
      case 'uploading':
        return 'Uploading';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{pdfInfo.filename}</h2>
            <p className="text-sm text-gray-500">
              Uploaded {new Date(pdfInfo.uploadDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshStatus}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          
          <Link
            to={`/chat/${pdfId}`}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            Chat
          </Link>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-2 rounded-full border ${getStatusColor(pdfInfo.processingStatus)}`}>
          {getStatusIcon(pdfInfo.processingStatus)}
          <span className="ml-2 font-medium">{getStatusText(pdfInfo.processingStatus)}</span>
        </div>
      </div>

      {/* File Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">File Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">File Size:</span>
              <span className="font-medium">{(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pages:</span>
              <span className="font-medium">{pdfInfo.pageCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Language:</span>
              <span className="font-medium">{pdfInfo.language || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {pdfInfo.processingMetadata && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Processing Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Text Chunks:</span>
                <span className="font-medium">{pdfInfo.processingMetadata.totalChunks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Words:</span>
                <span className="font-medium">{pdfInfo.processingMetadata.totalTokens || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chunk Size:</span>
                <span className="font-medium">{pdfInfo.processingMetadata.chunkSize || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {pdfInfo.tags && pdfInfo.tags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Key Topics</h3>
          <div className="flex flex-wrap gap-2">
            {pdfInfo.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {pdfInfo.summary && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Document Summary</h3>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            {pdfInfo.summary}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={deletePDF}
            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete PDF
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          {pdfInfo.processingStatus === 'completed' && (
            <span>Ready for AI-powered questions</span>
          )}
          {pdfInfo.processingStatus === 'failed' && (
            <span>Processing failed - please try uploading again</span>
          )}
          {(pdfInfo.processingStatus === 'processing' || pdfInfo.processingStatus === 'chunking' || pdfInfo.processingStatus === 'embedding') && (
            <span>Processing in progress...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFStatus;
