import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, MessageCircle, Upload } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">PDF Chat</span>
          </Link>
          
          <nav className="flex items-center space-x-8">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/upload"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/upload') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload PDF</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
