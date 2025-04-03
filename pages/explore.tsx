import { useEffect, useState, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { Post, Comment, loadFromCache, setFeed } from '../lib/slices/postsSlice';
import db from '../giga-aura/services/db-init';
import axios from 'axios';
import toast from 'react-hot-toast';

const ExplorePage: NextPage = () => {
  const dispatch = useDispatch();
  const { feed, comments } = useSelector((state: RootState) => state.posts as {
    feed: Post[],
    comments: Comment[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'latest' | 'popular'>('trending');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  // Function to get the API base URL
  const getApiBaseUrl = () => {
    // In production, use the deployment URL
    if (process.env.NODE_ENV === 'production') {
      return 'https://gigaaura.com';
    }
    // In development, use localhost
    return 'http://localhost:3000';
  };

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      
      try {
        // First try to load posts from API
        console.log("Loading posts from API for Explore page");
        const response = await axios.get(`${getApiBaseUrl()}/api/posts`);
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log("Found posts in API:", response.data.length);
          dispatch(setFeed(response.data));
        } else {
          // Fallback to direct database call
          console.log("No posts found in API, trying database directly");
          const posts = await db.getPosts();
          
          if (posts && Array.isArray(posts) && posts.length > 0) {
            console.log("Found posts in database:", posts.length);
            dispatch(setFeed(posts));
          } else {
            // Fallback to local cache as last resort
            console.log("No posts found in database, loading from cache");
            dispatch(loadFromCache());
          }
        }
      } catch (error) {
        console.error("Error loading posts:", error);
        // Fallback to cache
        dispatch(loadFromCache());
      } finally {
        setIsLoading(false);
      }
    };
    
    // Load posts initially
    loadPosts();
    
    // Set up auto-refresh interval (every 5 seconds for real-time updates)
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('Auto-refreshing explore posts...');
        loadPosts();
      }, 5000); // 5 seconds for real-time effect
      
      // Set up Server-Sent Events for real-time updates
      if (typeof window !== 'undefined') {
        try {
          // Close any existing connection
          if (sseRef.current) {
            sseRef.current.close();
          }
          
          // Create a new EventSource connection for real-time updates
          const eventSource = new EventSource(`${getApiBaseUrl()}/api/events`);
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'new-post') {
                // Show notification of new posts
                setHasNewPosts(true);
                // Refresh posts immediately
                loadPosts();
                
                // Show toast notification
                toast.success('New content available!', {
                  id: 'new-posts-explore',
                  duration: 3000,
                });
              }
            } catch (error) {
              console.error('Error processing SSE event:', error);
            }
          };
          
          eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            // Close and try to reconnect after a delay
            eventSource.close();
            setTimeout(() => {
              if (autoRefresh) {
                // Try to reconnect
                const newEventSource = new EventSource(`${getApiBaseUrl()}/api/events`);
                sseRef.current = newEventSource;
              }
            }, 5000);
          };
          
          sseRef.current = eventSource;
        } catch (error) {
          console.error('Error setting up SSE:', error);
        }
      }
    }
    
    // Cleanup on component unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Close SSE connection
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [dispatch, autoRefresh]);

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments.filter((comment: Comment) => comment.postId === postId);
  };

  // Filter posts based on selected filter
  const getFilteredPosts = () => {
    if (!feed || feed.length === 0) return [];
    
    switch (selectedFilter) {
      case 'trending':
        // Trending: Sort by combination of likes, comments and recency
        return [...feed].sort((a, b) => {
          const scoreA = a.likes * 2 + a.comments * 3 + new Date(a.createdAt).getTime() / 10000000;
          const scoreB = b.likes * 2 + b.comments * 3 + new Date(b.createdAt).getTime() / 10000000;
          return scoreB - scoreA;
        });
      case 'latest':
        // Latest: Sort by creation date
        return [...feed].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'popular':
        // Popular: Sort by likes count
        return [...feed].sort((a, b) => b.likes - a.likes);
      default:
        return feed;
    }
  };

  const handleRefreshFeed = () => {
    setHasNewPosts(false);
    // Force a refresh
    axios.get(`${getApiBaseUrl()}/api/posts`)
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          dispatch(setFeed(response.data));
        }
      })
      .catch(error => {
        console.error('Error refreshing explore feed:', error);
      });
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark">
      <Head>
        <title>Explore | GigaAura</title>
        <meta name="description" content="Explore trending posts on GigaAura" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        
        <div className="col-span-1 md:col-span-6 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
            <h1 className="text-2xl font-bold text-black dark:text-white mb-4">Explore</h1>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedFilter('trending')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'trending'
                    ? 'bg-[#F6B73C] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setSelectedFilter('latest')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'latest'
                    ? 'bg-[#F6B73C] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSelectedFilter('popular')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedFilter === 'popular'
                    ? 'bg-[#F6B73C] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Popular
              </button>
              
              <div className="ml-auto flex items-center">
                <button
                  onClick={handleRefreshFeed}
                  className="text-[#2C89B7] hover:underline text-sm"
                >
                  Refresh
                </button>
                
                <div className="ml-4 flex items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">
                    Auto-refresh {autoRefresh ? 'on' : 'off'}
                  </span>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none ${
                      autoRefresh ? 'bg-[#F6B73C]' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                        autoRefresh ? 'transform translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* New Posts Notification */}
            {hasNewPosts && (
              <div 
                className="bg-[#F6B73C] text-white py-2 px-4 rounded-lg text-center cursor-pointer shadow-md hover:bg-[#e5a835] transition-colors mb-4"
                onClick={handleRefreshFeed}
              >
                New posts available! Click to refresh
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-10 h-10 border-4 border-[#F6B73C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredPosts().length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">No posts yet</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Be the first to create content and earn Aura Points!
                  </p>
                </div>
              ) : (
                getFilteredPosts().map((post: Post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    comments={getPostComments(post.id)} 
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 sticky top-20">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Trending Topics</h2>
            <div className="space-y-3">
              {['#Web3', '#DeFi', '#NFTs', '#Blockchain', '#Aura'].map((tag) => (
                <div key={tag} className="flex items-center justify-between">
                  <span className="text-[#2C89B7] hover:underline cursor-pointer">{tag}</span>
                  <span className="text-sm text-gray-500">{Math.floor(Math.random() * 1000)} posts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExplorePage; 