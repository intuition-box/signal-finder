// src/components/ErrorBoundary.js
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You could add error reporting service here
    // Example: Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md w-full mx-auto p-6 text-center">
            <div className="mb-8">
              <h2 className="text-red-500 text-2xl font-bold mb-4">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-400 mb-4">
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </p>
              {this.state.error && (
                <pre className="bg-gray-800 p-4 rounded-md text-left text-sm text-gray-300 overflow-auto mb-4">
                  {this.state.error.toString()}
                </pre>
              )}
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              
              <button 
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="text-gray-400 cursor-pointer">Stack trace</summary>
                <pre className="mt-2 bg-gray-800 p-4 rounded-md text-sm text-gray-300 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;