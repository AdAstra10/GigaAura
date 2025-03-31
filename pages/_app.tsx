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
import Router from 'next/router';

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
  // Global error handling
  const [hasError, setHasError] = useState(false);
  
  // This prevents toString errors from crashing the app
  const fixEthereumConflicts = () => {
    // Ensure window.ethereum is always either null or a valid object but never undefined
    try {
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'ethereum', {
          value: null,
          writable: false,
          configurable: false
        });
      }
    } catch (e) {
      console.warn('Error setting up ethereum property protection', e);
    }
  };
  
  useEffect(() => {
    // Fix ethereum conflicts when app loads
    fixEthereumConflicts();
    
    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      // Check if it's a toString error or ethereum related
      if (event.error && 
          (event.error.message?.includes('toString') || 
           event.error.message?.includes('ethereum') ||
           event.error.message?.includes('Cannot read properties of null'))) {
        
        console.error('Global error caught:', event.error);
        setHasError(true);
        
        // Redirect to home page if on root
        if (window.location.pathname === '/') {
          Router.replace('/home');
        }
        
        // Prevent default error handling
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handleError);
    
    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Only redirect if it's a known wallet error
      if (event.reason?.message && 
          (event.reason.message.includes('ethereum') || 
           event.reason.message.includes('wallet') ||
           event.reason.message.includes('toString'))) {
        setHasError(true);
        // Redirect to home page if on root
        if (window.location.pathname === '/') {
          Router.replace('/home');
        }
      }
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  if (hasError) {
    return <ErrorFallback error={new Error('Application crashed')} />;
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