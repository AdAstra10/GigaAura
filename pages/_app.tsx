import { useState, useEffect } from 'react';
import { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '../lib/store';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';
import { updateProfile } from '../lib/slices/userSlice';
import '../styles/globals.css';
import Router, { useRouter } from 'next/router';
import { ErrorBoundary } from 'react-error-boundary';

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

// Error boundary component to catch React errors
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

// Wrapper component to access wallet context inside app
const AppWithWallet = ({ Component, pageProps }: { Component: AppProps['Component']; pageProps: AppProps['pageProps'] }) => {
  const { walletAddress } = useWallet();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (walletAddress) {
      // Reset the loaded state whenever wallet address changes
      setLoaded(false);
    }
  }, [walletAddress]);
  
  useEffect(() => {
    if (walletAddress && !loaded) {
      // Load wallet-specific data when wallet connects
      console.log("Loading data for wallet:", walletAddress);
      
      try {
        // Load Aura Points
        try {
          // Try to load aura points from localStorage or set default
          const pointsStr = localStorage.getItem(`auraPoints_${walletAddress}`);
          const points = pointsStr ? parseInt(pointsStr, 10) : 100;
          store.dispatch(loadWalletPoints(points));
        } catch (error) {
          console.error("Error loading aura points:", error);
          store.dispatch(loadWalletPoints(100)); // Default
        }
        
        // Load profile data from localStorage
        try {
          // Load profile picture
          const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
          const avatar = profilePictures[walletAddress] || null;
          
          // Load banner image
          const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
          const bannerImage = bannerImages[walletAddress] || null;
          
          // Load username
          const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
          const username = usernames[walletAddress] || null;
          
          // Load bio
          const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
          const bio = bios[walletAddress] || null;
          
          // Update profile in Redux store
          store.dispatch(updateProfile({
            username,
            bio,
            avatar,
            bannerImage
          }));
          
          console.log("Loaded profile data:", { username, avatar });
        } catch (error) {
          console.error('Error loading profile data:', error);
        }
        
        setLoaded(true);
      } catch (err) {
        console.error("Error in wallet data loading:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } else if (!walletAddress) {
      setLoaded(false);
    }
  }, [walletAddress, loaded]);
  
  if (error) {
    return <ErrorFallback error={error} />;
  }
  
  return <Component {...pageProps} />;
};

// Modify the main App component to include better error handling
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
      
      // Check for toString or wallet-related errors
      if (event.error && 
          (event.error.message?.includes('toString') || 
           event.error.message?.includes('ethereum') ||
           event.error.message?.includes('null'))) {
        
        setErrorMessage(safeToString(event.error.message));
        setHasError(true);
        
        // Prevent default error handling 
        event.preventDefault();
      }
    };
    
    // Handle promise rejection errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event);
      
      const errorMessage = event.reason?.message || 'Promise rejection';
      
      // If it's a wallet error, show error UI
      if (errorMessage.includes('ethereum') || 
          errorMessage.includes('wallet') ||
          errorMessage.includes('null')) {
        
        setErrorMessage(safeToString(errorMessage));
        setHasError(true);
        event.preventDefault();
      }
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
  
  // Render the normal app
  return (
    <Provider store={store}>
      <DarkModeProvider>
        <WalletProvider>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <AppWithWallet Component={Component} pageProps={pageProps} />
            <Toaster position="bottom-center" />
          </ErrorBoundary>
        </WalletProvider>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 