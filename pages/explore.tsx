import { useEffect, useState, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import PostCard from '../components/PostCard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, loadFromCache, setFeed } from '../lib/slices/postsSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const ExplorePage: NextPage = () => {
  const dispatch = useDispatch();
  const feed = useSelector((state: RootState) => state.posts.feed);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'latest' | 'popular'>('trending');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  // Function to get the API base URL
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return ''; // Should not happen client-side
  };

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const apiUrl = `${getApiBaseUrl()}/api/posts`;
        console.log(`Fetching posts from ${apiUrl}`);
        const response = await axios.get(apiUrl, {
          headers: {
            'Cache-Control': 'no-cache', // Ensure fresh data
            'Pragma': 'no-cache'
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          console.log("Fetched posts:", response.data.length);
          dispatch(setFeed(response.data));
        } else {
          console.log("No posts found in API response or invalid format, clearing feed.");
          dispatch(setFeed([]));
        }
      } catch (error) {
        console.error("Error loading posts:", error);
        toast.error('Could not load posts.');
        dispatch(setFeed([])); // Clear feed on error
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPosts(); // Initial load
    
    // Set up auto-refresh polling
    if (autoRefresh) {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); // Clear existing interval
      refreshIntervalRef.current = setInterval(() => {
        console.log('Auto-refreshing explore posts...');
        loadPosts();
      }, 60000); // Poll every minute
    }
    
    // Set up Server-Sent Events (SSE)
    if (autoRefresh && typeof window !== 'undefined') {
      let eventSource: EventSource | null = null;
      const connectSSE = () => {
        try {
          if (sseRef.current) {
            sseRef.current.close(); // Close existing connection
          }
          const sseUrl = `${getApiBaseUrl()}/api/events`;
          console.log(`Connecting to SSE at ${sseUrl}`);
          eventSource = new EventSource(sseUrl);
          sseRef.current = eventSource; // Store the reference
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'new-post') {
                setHasNewPosts(true);
                toast.success('New content available!', {
                  id: 'new-posts-explore',
                });
                // Consider refreshing immediately or just showing the banner
                 loadPosts(); // Refresh immediately
              }
            } catch (error) {
              console.error('Error processing SSE event:', error);
            }
          };
          
          eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            eventSource?.close();
            sseRef.current = null;
            // Optional: Implement retry logic with backoff
            // setTimeout(connectSSE, 5000); 
          };
          
          eventSource.onopen = () => {
            console.log('SSE connection opened.');
          };

        } catch (error) {
          console.error('Error setting up SSE:', error);
        }
      };
      
      connectSSE(); // Initial connection attempt
    }
    
    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (sseRef.current) {
        console.log('Closing SSE connection.');
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [dispatch, autoRefresh]); // Rerun effect if autoRefresh changes

  // Filter posts based on selected filter
  const getFilteredPosts = () => {
    if (!feed || feed.length === 0) return [];
    
    // Basic sorting - adjust scoring as needed
    switch (selectedFilter) {
      case 'trending':
        return [...feed].sort((a, b) => {
          const scoreA = (a.likes || 0) + (a.comments?.length || 0) * 2; // Simple score
          const scoreB = (b.likes || 0) + (b.comments?.length || 0) * 2;
          return scoreB - scoreA;
        });
      case 'latest':
        return [...feed].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'popular':
        return [...feed].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return feed;
    }
  };

  const handleRefreshFeed = () => {
    setHasNewPosts(false);
    setIsLoading(true); // Show loading indicator during manual refresh
    axios.get(`${getApiBaseUrl()}/api/posts`, { headers: { 'Cache-Control': 'no-cache' } })
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          dispatch(setFeed(response.data));
          toast.success('Feed refreshed!');
        }
      })
      .catch(error => {
        console.error('Error refreshing explore feed:', error);
        toast.error('Could not refresh feed.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const filteredPosts = getFilteredPosts();

  return (
    <Layout>
      <Head>
        <title>Explore | GigaAura</title>
        <meta name="description" content="Explore trending posts on GigaAura" />
      </Head>
      
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <h1 className="text-xl font-bold text-black dark:text-white">Explore</h1>
      </div>

      {hasNewPosts && (
        <button
          onClick={handleRefreshFeed}
          className="w-full flex items-center justify-center py-3 bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          New posts available
        </button>
      )}

      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setSelectedFilter('trending')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFilter === 'trending' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'}`}
          >
            Trending
          </button>
          <button
            onClick={() => setSelectedFilter('latest')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFilter === 'latest' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'}`}
          >
            Latest
          </button>
          <button
            onClick={() => setSelectedFilter('popular')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedFilter === 'popular' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'}`}
          >
            Popular
          </button>
          
          <div className="ml-auto flex items-center space-x-2">
             <span className="text-xs text-gray-500 dark:text-gray-400">Auto-Refresh</span>
             <button
               onClick={() => setAutoRefresh(!autoRefresh)}
               className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${autoRefresh ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
             >
               <span
                 className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`}
               />
             </button>
           </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            Loading posts...
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} comments={post.comments || []} />
          ))
        ) : (
          <div className="p-6 text-center text-gray-500">
            No posts found for "{selectedFilter}".
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ExplorePage; 