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

// Add this helper function near the top of the file
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

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  
  // Global error handler for toString and other critical errors
  useEffect(() => {
    const originalToString = Object.prototype.toString;
    
    // Safe toString that handles nulls
    Object.prototype.toString = function() {
      try {
        // If this is null/undefined, return a safe value instead of throwing
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

    // Protect against React state errors
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes("toString") || 
           event.error.message.includes("Cannot read properties of null") ||
           event.error.message.includes("Minified React error #423"))) {
        
        console.warn('Caught critical React error, redirecting to safety');
        event.preventDefault();
        setHasError(true);
        
        // Only redirect if not already on the error page
        if (router.pathname !== '/error' && router.pathname !== '/home') {
          router.push('/home');
        }
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      // Restore original toString when component unmounts
      Object.prototype.toString = originalToString;
      window.removeEventListener('error', handleError);
    };
  }, [router]);

  // If we have an error, show error view
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <p className="mb-4 text-gray-700 dark:text-gray-300">The application encountered an error.</p>
          <button 
            onClick={() => {
              setHasError(false);
              router.push('/home');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Provider store={store}>
      <DarkModeProvider>
        <WalletProvider>
          <AppWithWallet Component={Component} pageProps={pageProps} />
          <Toaster position="bottom-center" />
        </WalletProvider>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 