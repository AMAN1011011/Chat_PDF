import React, { useState, useCallback } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PDFUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccess('');
    
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    
    // Validate file size (100MB limit)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB.');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setSuccess('PDF uploaded successfully! Processing in background...');
      
      // Wait a moment to show success, then redirect to chat
      setTimeout(() => {
        navigate(`/chat/${result.pdfId}`);
      }, 2000);

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your PDF Document
        </h1>
        <p className="text-gray-600">
          Select a PDF file to start chatting with its content using AI
        </p>
      </div>

      {/* File Upload Area */}
      <div 
        className={`bg-white rounded-xl shadow-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : file 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
              <Upload className="h-10 w-10 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your PDF here
            </h3>
            <p className="text-gray-500 mb-6">
              or click to browse files
            </p>
            
            <label className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              Choose PDF File
            </label>
            
            <p className="text-sm text-gray-400 mt-4">
              Maximum file size: 100MB
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <FileText className="h-10 w-10 text-green-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {file.name}
            </h3>
            <p className="text-gray-500 mb-6">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={uploadFile}
                disabled={uploading}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </button>
              
              <button
                onClick={removeFile}
                disabled={uploading}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Remove
              </button>
            </div>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Upload Progress</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {uploadProgress < 100 ? 'Uploading and processing PDF...' : 'Processing complete!'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Upload Error
              </h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">
                Upload Successful
              </h4>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">
              How it works
            </h4>
            <p className="text-sm text-blue-700">
              1. Upload your PDF document (up to 500 pages)<br/>
              2. Our AI processes and analyzes the content<br/>
              3. Start asking questions about your document<br/>
              4. Get intelligent, context-aware answers
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4 mr-2" />
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default PDFUpload;
