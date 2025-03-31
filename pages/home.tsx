import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { addPost, loadFromCache } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import { FaHome } from 'react-icons/fa';

// Simple static feed component instead of dynamic import
const SimpleFeed = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simple timeout to simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg h-64 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
      </div>
    );
  }
  
  // Simple static content without any dynamic data
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 justify-center">
          <FaHome className="text-indigo-500" />
          <h2 className="text-xl font-bold">Welcome to GigaAura</h2>
        </div>
      </div>
      
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your feed is currently being updated with the latest posts.
        </p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Thank you for your patience while we improve your experience.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

const HomePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  
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
          <SimpleFeed />
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <AuraSidebar />
        </div>
      </main>
    </>
  );
};

export default HomePage; 