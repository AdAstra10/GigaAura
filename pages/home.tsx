import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import { FaHome, FaSpinner } from 'react-icons/fa';

// Ultra simple home page that works without wallet connections or redux
const HomePage = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading with a simple timeout
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Simple feed display component with no dependencies
  const StaticFeed = () => {
    if (isLoading) {
      return (
        <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg h-64 flex items-center justify-center">
          <FaSpinner className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      );
    }
    
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 justify-center">
            <FaHome className="text-indigo-500" />
            <h2 className="text-xl font-bold">Welcome to GigaAura</h2>
          </div>
        </div>
        
        <div className="p-6">
          {/* Post Input with proper form IDs */}
          <div className="mb-6">
            <form className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <input 
                type="text" 
                id="postInput"
                name="postInput"
                placeholder="What's on your mind?"
                className="w-full p-2 mb-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              />
              <button 
                type="button"
                id="submitPost"
                name="submitPost"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Post
              </button>
            </form>
          </div>
          
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <div className="flex items-center mb-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-3">
                F
              </div>
              <div>
                <p className="font-bold">Founder</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
            <p className="mb-3">Welcome to GigaAura! We're working on making this platform the best it can be.</p>
            <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
              <button className="flex items-center" id="likeBtn1" name="likeBtn1">
                <span className="mr-1">❤️</span> Like
              </button>
              <button className="flex items-center" id="commentBtn1" name="commentBtn1">
                <span className="mr-1">💬</span> Comment
              </button>
              <button className="flex items-center" id="shareBtn1" name="shareBtn1">
                <span className="mr-1">🔄</span> Share
              </button>
            </div>
          </div>
          
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <div className="flex items-center mb-3">
              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white mr-3">
                G
              </div>
              <div>
                <p className="font-bold">GigaAura Team</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">1 day ago</p>
              </div>
            </div>
            <p className="mb-3">We're excited to see what you'll create with GigaAura! Share your thoughts and ideas.</p>
            <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
              <button className="flex items-center" id="likeBtn2" name="likeBtn2">
                <span className="mr-1">❤️</span> Like
              </button>
              <button className="flex items-center" id="commentBtn2" name="commentBtn2">
                <span className="mr-1">💬</span> Comment
              </button>
              <button className="flex items-center" id="shareBtn2" name="shareBtn2">
                <span className="mr-1">🔄</span> Share
              </button>
            </div>
          </div>
          
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
            No more posts to show at this time.
          </p>
        </div>
      </div>
    );
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
          <StaticFeed />
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <AuraSidebar />
        </div>
      </main>
    </>
  );
};

export default HomePage; 