import { useState, useEffect, Component, ReactNode } from 'react';
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
import { cleanupFirebase } from '../services/db';

// Force dynamic rendering to ensure nonces are properly handled
export const dynamic = 'force-dynamic';

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

// For TypeScript, extend the Function interface to allow our __protected property
declare global {
  interface Function {
    __protected?: boolean;
  }
}

// Add ErrorFallback component
const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
      <p className="text-[var(--text-primary)] mb-4">Please try refreshing the page</p>
      <button 
        onClick={() => window.location.href = '/home'} 
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
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

/**
 * Safe null check utility to prevent toString errors
 * This is used throughout the application to prevent common errors
 */
const ensureSafeToString = () => {
  try {
    // Only apply if toString isn't already protected
    if (!Object.prototype.toString.__protected) {
      // Keep a reference to the original method
      const originalToString = Object.prototype.toString;
      
      // Create a safer version
      const safeToString = function(this: any) {
        try {
          // Null/undefined special handling
          if (this === null || this === undefined) {
            return '[object SafeNull]';
          }
          return originalToString.call(this);
        } catch (e) {
          // Last resort safety
          return '[object Protected]';
        }
      };
      
      // Mark our function as protected
      Object.defineProperty(safeToString, '__protected', { value: true });
      
      // Replace the original method
      Object.prototype.toString = safeToString;
    }
  } catch (e) {
    console.warn('Failed to protect toString method:', e);
  }
};

// Wrapper component to access wallet context inside app
const AppWithWallet = ({ Component, pageProps }: { Component: AppProps['Component']; pageProps: AppProps['pageProps'] }) => {
  const { walletAddress } = useWallet();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Apply our toString protection early
  useEffect(() => {
    ensureSafeToString();
  }, []);
  
  useEffect(() => {
    if (walletAddress) {
      // Reset the loaded state whenever wallet address changes
      setLoaded(false);
    }
  }, [walletAddress]);
  
  useEffect(() => {
    if (walletAddress && !loaded) {
      // Load wallet-specific data when wallet connects - let's optimize this
      console.log("Loading data for wallet:", walletAddress);
      
      try {
        // OPTIMIZATION: Load from localStorage first for immediate UI update
        let hasLoadedAuraPoints = false;
        
        // Load Aura Points from localStorage first
        try {
          const pointsStr = localStorage.getItem(`auraPoints_${walletAddress}`);
          if (pointsStr) {
            try {
              // Parse the full aura points state object
              const auraPointsState = JSON.parse(pointsStr);
              console.log("Loaded aura points from localStorage:", auraPointsState);
              
              // Dispatch the full state object to Redux
              store.dispatch(loadWalletPoints(auraPointsState));
              hasLoadedAuraPoints = true;
            } catch (e) {
              console.error("Error parsing aura points JSON:", e);
              // Try to handle legacy format (if it's just a number)
              const points = parseInt(pointsStr, 10);
              if (!isNaN(points)) {
                store.dispatch(loadWalletPoints(points)); 
                hasLoadedAuraPoints = true;
              } else {
                store.dispatch(loadWalletPoints(100)); // Default
              }
            }
          } else {
            console.log("No aura points found for wallet, setting default");
            store.dispatch(loadWalletPoints(100)); // Default
          }
        } catch (error) {
          console.error("Error loading aura points:", error);
          store.dispatch(loadWalletPoints(100)); // Default
        }
        
        // Load profile data from localStorage - this is already optimized
        try {
          // Load profile picture
          const profilePictures = safeJSONParse(localStorage.getItem('profilePictures') || '{}', {});
          const avatar = profilePictures[walletAddress] || null;
          
          // Load banner image
          const bannerImages = safeJSONParse(localStorage.getItem('bannerImages') || '{}', {});
          const bannerImage = bannerImages[walletAddress] || null;
          
          // Load username
          const usernames = safeJSONParse(localStorage.getItem('usernames') || '{}', {});
          const username = usernames[walletAddress] || null;
          
          // Load bio
          const bios = safeJSONParse(localStorage.getItem('userBios') || '{}', {});
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
        
        // Mark as loaded to prevent duplicate loading
        setLoaded(true);
        
        // OPTIMIZATION: Load cloud data in background after UI is ready
        if (hasLoadedAuraPoints) {
          // We don't need to wait for this to finish
          import('../services/db').then(async (db) => {
            try {
              const cloudAuraPoints = await db.default.getAuraPoints(walletAddress);
              if (cloudAuraPoints) {
                console.log("FOUND CLOUD AURA POINTS for " + walletAddress + ":", cloudAuraPoints);
                store.dispatch(loadWalletPoints(cloudAuraPoints));
                console.log("Updated state with data from cloud database");
              }
            } catch (error) {
              console.error("Error loading cloud aura points:", error);
            }
          }).catch(error => {
            console.error("Error loading db module:", error);
          });
        }
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
    // Ensure toString protection is applied as early as possible
    ensureSafeToString();
    
    // Handle unhandled exceptions
    const handleError = (event: ErrorEvent) => {
      // Get error details safely
      const errorMsg = event.error?.message || event.message || 'Unknown error';
      const errorName = event.error?.name || 'Error';
      
      console.error(`Global error caught: ${errorName}`, event.error);
      
      // Check for known problematic errors
      const isWalletError = 
        errorMsg.includes('ethereum') || 
        errorMsg.includes('web3') || 
        errorMsg.includes('metamask') ||
        errorMsg.includes('wallet');
        
      const isNullError = 
        errorMsg.includes('null') || 
        errorMsg.includes('undefined') || 
        errorMsg.includes('toString');
      
      // Handle the error if it's a wallet or null-related issue
      if (isWalletError || isNullError) {
        // Update error state to trigger fallback UI
        setErrorMessage(safeToString(errorMsg));
        setHasError(true);
        
        // Prevent default error handling
        event.preventDefault();
        return true;
      }
    };
    
    // Handle promise rejection errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Get error details safely
      const errorMsg = event.reason?.message || 'Promise rejection';
      console.error('Unhandled promise rejection:', errorMsg);
      
      // Check if it's a wallet-related error
      const isWalletError = 
        errorMsg.includes('ethereum') || 
        errorMsg.includes('web3') || 
        errorMsg.includes('wallet') ||
        errorMsg.includes('metamask');
        
      const isNullError = 
        errorMsg.includes('null') || 
        errorMsg.includes('undefined') || 
        errorMsg.includes('toString');
      
      // Handle the error if it's a wallet issue
      if (isWalletError || isNullError) {
        setErrorMessage(safeToString(errorMsg));
        setHasError(true);
        event.preventDefault();
        return true;
      }
    };
    
    // Add event listeners
    window.addEventListener('error', handleError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleRejection);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  // Handle route changes and cleanup Firebase
  useEffect(() => {
    const handleRouteChangeStart = () => {
      // Clean up Firebase connections on route change
      cleanupFirebase()
        .then(() => console.log('Firebase cleaned up on route change'))
        .catch(err => console.error('Error cleaning up Firebase:', err));
    };

    const handleBeforeUnload = () => {
      cleanupFirebase()
        .then(() => console.log('Firebase cleaned up before page unload'))
        .catch(err => console.error('Error cleaning up Firebase:', err));
    };

    // Add event listeners
    Router.events.on('routeChangeStart', handleRouteChangeStart);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up event listeners
    return () => {
      Router.events.off('routeChangeStart', handleRouteChangeStart);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // If we've encountered an error, show the error UI
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-black rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          {errorMessage && (
            <p className="mb-4 text-[var(--text-primary)] text-sm">
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
            className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover mr-2"
          >
            Go to Home
          </button>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 mt-2 sm:mt-0"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Provider store={store}>
        <DarkModeProvider>
          <WalletProvider>
            <AppWithWallet Component={Component} pageProps={pageProps} />
            <Toaster position="bottom-center" />
          </WalletProvider>
        </DarkModeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default MyApp; 