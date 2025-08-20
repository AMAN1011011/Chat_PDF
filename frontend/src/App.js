import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import PDFUpload from './components/PDFUpload';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<PDFUpload />} />
            <Route path="/chat/:pdfId" element={<ChatInterface />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
