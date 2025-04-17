import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import Feed from '../components/Feed';
import { AppDispatch } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import { ErrorBoundary } from 'react-error-boundary';
import Head from 'next/head';
import AuraSidebar from '../components/AuraSidebar';
import Layout from '../components/Layout';

// Error fallback for the entire Home page
function HomeFallback() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        We're sorry, but there was an error loading the home page.
      </p>
      <button
        onClick={() => router.reload()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        Reload page
      </button>
    </div>
  );
}

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { walletAddress, connectWallet, connected } = useWallet();
  
  // Add a safety flag to detect rendering issues
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Protect against wallet-related errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Log errors but don't let them crash the app
      console.error('Caught in global handler:', event.error);
      
      // If the error is related to ethereum, suppress it
      if (event.message?.includes('ethereum') || 
          event.message?.includes('MetaMask')) {
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  // If not mounted yet, show minimal UI to avoid hydration issues
  if (!hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary FallbackComponent={HomeFallback}>
      <Head>
        <title>Home | GigaAura</title>
        <meta name="description" content="GigaAura - Your social platform with a purpose" />
      </Head>

      <Layout rightSidebarContent={<AuraSidebar />}>
        <ErrorBoundary FallbackComponent={() => (
          <div className="p-4 bg-white dark:bg-black rounded-lg shadow">
            <h3 className="text-xl font-medium mb-2">Feed unavailable</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're having trouble loading your feed. Please try again later.
            </p>
            <button 
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full"
              onClick={() => router.reload()}
            >
              Reload
            </button>
          </div>
        )}>
          <Feed />
        </ErrorBoundary>
      </Layout>
    </ErrorBoundary>
  );
};

export default Home; 