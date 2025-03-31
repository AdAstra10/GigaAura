import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { loadFromCache } from '../lib/slices/postsSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { ErrorInfo } from 'react';

// Loading fallback for Feed component
const FeedLoading = () => (
  <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg h-64 flex items-center justify-center">
    <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-center">
    <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Something went wrong</h3>
    <p className="text-red-600 dark:text-red-300 mb-4">There was an error loading the feed</p>
    <button 
      onClick={() => window.location.reload()} 
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
    >
      Try Again
    </button>
  </div>
);

// Use noSSR option to prevent hydration issues
const Feed = dynamic(() => import('../components/Feed'), { 
  ssr: false,
  loading: () => <FeedLoading />
});

const HomePage = () => {
  const dispatch = useDispatch();
  const { walletAddress, connectWallet, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load feed from cache when component mounts
    try {
      dispatch(loadFromCache());
    } catch (error) {
      console.error("Error initializing home page:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Simple error handler to log errors but not interfere with rendering
  const handleError = (error: Error, info: ErrorInfo) => {
    console.error("Error in Home page:", error);
    console.error("Component stack:", info.componentStack);
  };

  return (
    <>
      <Head>
        <title>GigaAura | Home</title>
        <meta name="description" content="GigaAura - Connect with others in the Solana ecosystem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3 sidebar-column">
          <Sidebar className="sticky top-20" />
        </div>
        
        <div className="col-span-1 md:col-span-6 content-column">
          {isLoading ? (
            <FeedLoading />
          ) : (
            <ErrorBoundary 
              FallbackComponent={ErrorFallback} 
              onError={handleError}
            >
              <Feed />
            </ErrorBoundary>
          )}
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <AuraSidebar />
        </div>
      </main>
    </>
  );
};

export default HomePage; 