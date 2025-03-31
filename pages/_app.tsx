import { useState, useEffect, Component, ReactNode } from 'react';
import { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '../lib/store';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import '../styles/globals.css';
import Router, { useRouter } from 'next/router';

// Add these helper functions for safe data handling
function safeToString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  try {
    return String(value);
  } catch (e) {
    console.warn('Failed to convert value to string:', e);
    return '';
  }
}

// Safe JSON parse function
function safeJSONParse(jsonString: string, fallback: any = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
}

// Add ErrorFallback component
const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-4">Please try refreshing the page</p>
      <button 
        onClick={() => window.location.href = '/home'} 
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Go to Home
      </button>
    </div>
  );
};

// Fix the ErrorBoundary component's state type
class ErrorBoundary extends Component<{children: ReactNode, FallbackComponent: React.ComponentType<{error: Error}>}> {
  state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Caught error in ErrorBoundary:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      return <this.props.FallbackComponent error={this.state.error} />;
    }
    
    return this.props.children;
  }
}

// Simplified App component without wallet integration
function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Global error handler for React errors
  useEffect(() => {
    // Protect Object.prototype.toString
    const originalToString = Object.prototype.toString;
    
    // Override toString to prevent errors
    Object.prototype.toString = function() {
      try {
        // Handle null/undefined
        if (this === null || this === undefined) {
          console.warn('Prevented toString() call on null/undefined');
          return '[object SafeNull]';
        }
        return originalToString.call(this);
      } catch (e) {
        console.warn('Protected toString error:', e);
        return '[object Protected]';
      }
    };
    
    // Handle unhandled exceptions
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      
      setErrorMessage(safeToString(event.error?.message || 'Unknown error'));
      setHasError(true);
      
      // Prevent default error handling 
      event.preventDefault();
    };
    
    // Handle promise rejection errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event);
      
      const errorMessage = event.reason?.message || 'Promise rejection';
      setErrorMessage(safeToString(errorMessage));
      setHasError(true);
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    // Clean up
    return () => {
      Object.prototype.toString = originalToString;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  // If we've encountered an error, show the error UI
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          {errorMessage && (
            <p className="mb-4 text-gray-700 dark:text-gray-300 text-sm">
              Error: {errorMessage.substring(0, 100)}
              {errorMessage.length > 100 ? '...' : ''}
            </p>
          )}
          <button 
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              router.push('/home');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mr-2"
          >
            Go to Home
          </button>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 mt-2 sm:mt-0"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <DarkModeProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Component {...pageProps} />
          <Toaster position="bottom-center" />
        </ErrorBoundary>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 