import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments, loadFromCache, setError, setLoading } from '../lib/slices/postsSlice';
import { useWallet } from '../contexts/WalletContext';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { addNotification } from '../lib/slices/notificationsSlice';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useDarkMode } from '../contexts/DarkModeContext';
import dynamic from 'next/dynamic';
import { FaRegComment, FaRetweet, FaRegHeart, FaShare, FaImage, FaRegSmile, FaRegListAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useErrorBoundary } from 'react-error-boundary';
import PostCard from './PostCard';
import CreatePostForm from './CreatePostForm';
import { store } from '../lib/store';
import { cacheFeed, cacheUserPosts } from '../services/cache';
import db from '../giga-aura/services/db-init';
import axios from 'axios';
import pusherClient, { PUSHER_CHANNELS, PUSHER_EVENTS } from '../lib/pusher';
import { ArrowPathIcon, PencilIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { ArrowDownIcon } from '@heroicons/react/24/outline';

// Import the emoji picker dynamically to avoid SSR issues
// IMPORTANT: Keep this import outside of the component to prevent rendering issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

// Simple EmojiClickData interface to avoid dependency on the emoji-picker-react type
interface EmojiClickData {
  emoji: string;
}

// Utility function to get the API base URL
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Fix the PostCardSkeleton import by creating a simple implementation
const PostCardSkeleton: React.FC = () => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 p-4 animate-pulse">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
        
        <div className="flex-grow">
          {/* Author Header */}
          <div className="flex items-center mb-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="mx-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          
          {/* Post Content */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
          
          {/* Interaction Buttons */}
          <div className="flex justify-between mt-3">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix the function signature and define MAX_RETRIES
const MAX_RETRIES = 5;

// Simple LoadingSpinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Helper function to safely format dates
function getSafeDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Just now';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return 'Recently';
  }
}

// Error boundary fallback component
function FeedErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-gray-50 dark:bg-gray-800 my-4">
      <h3 className="text-xl font-bold text-black dark:text-white mb-4">Something went wrong loading the feed</h3>
      <p className="text-black dark:text-gray-300 mb-4">We're sorry, but there was an error loading your feed content.</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// Error boundary component
class FeedErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Feed error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Main Feed component - The entry point for the entire feed system
const Feed: React.FC = () => {
  return (
    <FeedErrorBoundary fallback={<FeedErrorFallback error={new Error('Feed error')} resetErrorBoundary={() => {}} />}>
      <FeedSafetyWrapper />
    </FeedErrorBoundary>
  );
};

// Safety wrapper component to handle additional checks
function FeedSafetyWrapper(props: Record<string, any>) {
  const [isMetaMaskDetected, setIsMetaMaskDetected] = useState(false);
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    // Check for ethereum in a type-safe way
    try {
      const win = window as unknown as { ethereum?: any };
      setIsMetaMaskDetected(!!win.ethereum);
    } catch (e) {
      console.error("Error checking for ethereum:", e);
    }
  }, []);

  // Render the FeedInner component with extra safety measures
  try {
    return <FeedInner {...props} isMetaMaskDetected={isMetaMaskDetected} />;
  } catch (error) {
    showBoundary(error instanceof Error ? error : new Error('Unknown feed error'));
    return <LoadingSpinner />;
  }
}

// Inner feed component with main logic
function FeedInner({ isMetaMaskDetected }: { isMetaMaskDetected?: boolean }) {
  const dispatch = useDispatch();
  const { feed: reduxPosts, loading, error } = useSelector((state: RootState) => state.posts);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const { showBoundary } = useErrorBoundary();
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const { connectWallet, connected, walletAddress } = useWallet();
  const { username, avatar, following } = useSelector((state: RootState) => state.user);
  
  // Add auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for tracking new posts
  const [lastPostCount, setLastPostCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(new Date());
  const sseRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pusherChannelRef = useRef<any>(null);

  // Filter for following tab
  const filteredPosts = activeTab === 'following' && following.length > 0
    ? reduxPosts.filter(post => following.includes(post.authorWallet))
    : reduxPosts;

  // Set up Pusher for real-time updates
  useEffect(() => {
    // Skip if SSR or not auto-refreshing
    if (typeof window === 'undefined' || !autoRefresh) return;

    try {
      // Subscribe to cache-posts-channel for real-time post updates
      const postsChannel = pusherClient.subscribe('cache-posts-channel');
      
      // Listen for new post events
      postsChannel.bind('new-post-event', (postData: any) => {
        console.log('Received new post via Pusher:', postData);
        if (postData && postData.id) {
          // Add the new post to Redux store
          dispatch(addPost(postData));
          
          // Update localStorage cache
          try {
            const cachedPosts = localStorage.getItem('giga-aura-posts');
            let posts = [];
            
            if (cachedPosts) {
              posts = JSON.parse(cachedPosts);
              
              // Check if post already exists
              const existingIndex = posts.findIndex((p: any) => p.id === postData.id);
              if (existingIndex >= 0) {
                // Update existing post
                posts[existingIndex] = postData;
              } else {
                // Add new post to beginning
                posts.unshift(postData);
              }
            } else {
              // Initialize cache with this post
              posts = [postData];
            }
            
            // Save updated posts to localStorage
            localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
          } catch (error) {
            console.error('Error updating localStorage with Pusher post:', error);
          }
          
          setHasNewPosts(true);
        }
      });
      
      // Listen for updated post events
      postsChannel.bind('updated-post-event', (postData: any) => {
        console.log('Received updated post via Pusher:', postData);
        if (postData && postData.id) {
          // Update the post in Redux store using setFeed with updated posts
          try {
            // Get current posts from Redux
            const currentPosts = [...reduxPosts];
            
            // Find and update the post
            const updatedPosts = currentPosts.map((post) => 
              post.id === postData.id ? {...post, ...postData} : post
            );
            
            // Update Redux with modified posts list
            dispatch(setFeed(updatedPosts));
            
            // Update localStorage cache
            const cachedPosts = localStorage.getItem('giga-aura-posts');
            if (cachedPosts) {
              let posts = JSON.parse(cachedPosts);
              
              // Update post if it exists
              const updatedCachedPosts = posts.map((p: any) => 
                p.id === postData.id ? {...p, ...postData} : p
              );
              
              // Save updated posts to localStorage
              localStorage.setItem('giga-aura-posts', JSON.stringify(updatedCachedPosts));
            }
          } catch (error) {
            console.error('Error updating post in Redux or localStorage:', error);
          }
        }
      });
      
      // Clean up on unmount
      return () => {
        postsChannel.unbind_all();
        pusherClient.unsubscribe('cache-posts-channel');
      };
    } catch (error) {
      console.error('Error setting up Pusher for feed:', error);
    }
  }, [dispatch, autoRefresh, reduxPosts]);

  // Load initial posts from localStorage if available
  useEffect(() => {
    try {
      const cachedPosts = localStorage.getItem('giga-aura-posts');
      if (cachedPosts) {
        const posts = JSON.parse(cachedPosts);
        if (Array.isArray(posts) && posts.length > 0) {
          dispatch(setFeed(posts));
        }
      }
    } catch (error) {
      console.error('Error loading posts from localStorage:', error);
    }
  }, [dispatch]);

  // Effect for loading posts on mount and periodically
  useEffect(() => {
    // Implementation details...
    // Note: This function loads posts from the API or falls back to localStorage
    
    const loadPosts = async () => {
      if (isRefreshing) return;
      
      try {
        setIsRefreshing(true);
        setLoading(true);
        
        // First, try to load from Redux store
        if (reduxPosts.length > 0) {
          setLoading(false);
          setLastPostCount(reduxPosts.length);
          setLastFetchTime(new Date());
          setIsRefreshing(false);
          return;
        }
        
        // Second, try to load from localStorage via loadFromCache
        dispatch(loadFromCache());
        
        // If we have posts in the Redux store after loading from cache, no need to fetch
        if (reduxPosts.length > 0) {
          setLoading(false);
          setLastPostCount(reduxPosts.length);
          setLastFetchTime(new Date());
          setIsRefreshing(false);
          return;
        }
        
        // Finally, fetch from API
        const timestamp = new Date().getTime();
        const apiUrl = `${window.location.origin}/api/posts?t=${timestamp}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Accept': 'application/json',
          },
          mode: 'same-origin',
          credentials: 'same-origin',
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          dispatch(setFeed(data));
          // Cache the feed in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('giga-aura-posts', JSON.stringify(data));
          }
        } else {
          console.warn('API returned empty or invalid data:', data);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
        setRetryCount(prev => prev + 1);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    
    // Initial load
    loadPosts();
    
    // Set up polling for new posts if auto-refresh is enabled
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isRefreshing) {
          loadPosts();
        }
      }, 60000); // Poll every minute
    }
    
    // Set up SSE for real-time updates (Server-Sent Events)
    if (typeof window !== 'undefined' && autoRefresh && !sseRef.current) {
      try {
        const eventSource = new EventSource(`${getApiBaseUrl()}/api/events`);
        
        eventSource.onmessage = (event) => {
          if (event.data) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'new-post') {
                setHasNewPosts(true);
                if (data.post) {
                  dispatch(addPost(data.post));
                }
              }
            } catch (e) {
              console.error('Error parsing SSE event:', e);
            }
          }
        };
        
        eventSource.onerror = () => {
          console.error('SSE connection error');
          eventSource.close();
          
          // Try to reconnect after 5 seconds
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            if (autoRefresh) {
              console.log('Attempting to reconnect to SSE...');
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
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [dispatch, autoRefresh, walletAddress, isRefreshing, retryCount, reduxPosts.length]);

  // Additional setup for Pusher for real-time updates is omitted for brevity

  // Function to refresh posts - could be triggered by pull-to-refresh or button
  const refreshPosts = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      setHasNewPosts(false);
      
      const timestamp = new Date().getTime();
      const apiUrl = `${getApiBaseUrl()}/api/posts?t=${timestamp}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json',
        },
        mode: 'same-origin',
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        dispatch(setFeed(data));
        // Cache the feed
        if (typeof window !== 'undefined') {
          localStorage.setItem('giga-aura-posts', JSON.stringify(data));
        }
        toast.success('Feed updated!');
      } else {
        console.warn('API returned empty or invalid data during refresh:', data);
        toast.success('No new posts available');
      }
    } catch (error) {
      console.error('Error refreshing posts:', error);
      toast.error('Error refreshing feed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Now return the JSX for the feed component with the X-style UI
  return (
    <div className="max-w-xl mx-auto">
      {/* Tab navigation - "For you" and "Following" tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-black z-10">
        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'for-you' 
                ? 'text-black dark:text-white border-b-2 border-primary' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            For you
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'following' 
                ? 'text-black dark:text-white border-b-2 border-primary' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            Following
          </button>
        </div>
      </div>
      
      {/* New Post Form */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-4">
        <CreatePostForm onSubmit={(content, mediaFile) => {
          // Simple implementation that dispatches to Redux
          if (!walletAddress || !content.trim()) return false;
          
          const newPost = {
            content,
            authorWallet: walletAddress,
            authorUsername: username || undefined,
            authorAvatar: avatar || undefined,
            mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : undefined,
            mediaType: mediaFile?.type.startsWith('image/') ? 'image' as const : 
                      mediaFile?.type.startsWith('video/') ? 'video' as const : undefined
          };
          
          dispatch(addPost(newPost));
          return true;
        }} />
      </div>
      
      {/* Show "New posts" banner if there are new posts */}
      {hasNewPosts && (
        <button
          onClick={refreshPosts}
          className="w-full flex items-center justify-center py-3 bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          New posts available
        </button>
      )}
      
      {/* Feed content */}
      <div ref={feedRef} className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
        {loading ? (
          // Show skeletons when loading
          <div>
            {[...Array(3)].map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          // Show error state
          <div className="p-4 text-center text-red-500">
            Error loading posts. Please try again.
            <button 
              onClick={refreshPosts}
              className="ml-2 text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty state
          <div className="py-10 text-center">
            {activeTab === 'following' ? (
              <div className="p-4">
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                  No posts from people you follow
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  When you follow someone, their posts will show up here.
                </p>
                <button
                  onClick={() => setActiveTab('for-you')}
                  className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
                >
                  Discover people to follow
                </button>
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                  No posts available
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Be the first to post something!
                </p>
              </div>
            )}
          </div>
        ) : (
          // Post list
          <div>
            {filteredPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
                comments={[]} // We'll fetch comments separately when needed
              />
            ))}
            
            {/* Loading more indicator */}
            {loadingMore && !endReached && (
              <div className="py-4 text-center">
                <LoadingSpinner />
              </div>
            )}
            
            {/* End of feed indicator */}
            {endReached && (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                You've reached the end of your feed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Feed;