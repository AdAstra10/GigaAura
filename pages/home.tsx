import { useEffect, useState, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { addPost, loadFromCache } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import AuraSidebar from '../components/AuraSidebar';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Loading fallback for Feed component
const FeedLoading = () => (
  <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg h-64 flex items-center justify-center">
    <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
  </div>
);

// Error fallback component
const ErrorFallback = () => (
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

// Dynamically import Feed with no SSR to avoid hydration issues
// Use a custom loading component with proper styling
const Feed = dynamic(() => import('../components/Feed').catch(err => {
  console.error('Failed to load Feed component:', err);
  // Return a simple component that renders the error fallback
  return () => <ErrorFallback />;
}), { 
  ssr: false,
  loading: () => <FeedLoading />
});

const HomePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connectWallet, walletConnected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const { feed } = useSelector((state: RootState) => state.posts);
  
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Catch any errors that might happen during initialization
    try {
      // Load feed from cache when component mounts
      dispatch(loadFromCache());
      setIsLoadingFeed(false);
    } catch (error) {
      console.error("Error initializing home page:", error);
      setHasError(true);
      setIsLoadingFeed(false);
    }
  }, [dispatch]);

  // Global error handler for this component
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Home page caught error:", event.error);
      setHasError(true);
      // Prevent the default error handling
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

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
          {hasError ? (
            <ErrorFallback />
          ) : (
            <Suspense fallback={<FeedLoading />}>
              <Feed />
            </Suspense>
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