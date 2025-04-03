import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments, loadFromCache } from '../lib/slices/postsSlice';
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
  const [activeTab, setActiveTab] = useState('for-you');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const { showBoundary } = useErrorBoundary();
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const { connectWallet, connected, walletAddress } = useWallet();
  const { username, avatar } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  
  // Get posts from Redux store
  const reduxPosts = useSelector((state: RootState) => state.posts.feed);
  const reduxComments = useSelector((state: RootState) => state.posts.comments);
  
  // Add auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for tracking new posts
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [lastPostCount, setLastPostCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(new Date());
  const sseRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      // Don't show loading indicator for refreshes, only for initial load
      if (reduxPosts.length === 0) {
        setLoading(true);
      }
      
      // If we're refreshing and already have posts, don't show loading spinner
      if (isRefreshing && reduxPosts.length > 0) {
        // Don't change loading state
      } else {
        setLoading(reduxPosts.length === 0);
      }
      
      try {
        console.log('Loading posts...');
        
        // Check if we're running in the browser
        if (typeof window !== 'undefined') {
          // First try to load posts from localStorage for immediate display
          const localPostsString = localStorage.getItem('giga-aura-posts');
          if (localPostsString) {
            try {
              const localPosts = JSON.parse(localPostsString);
              if (Array.isArray(localPosts) && localPosts.length > 0) {
                // Only update if we don't already have posts in the store
                if (reduxPosts.length === 0) {
                  // Sort posts to ensure newest are at the top
                  const sortedPosts = [...localPosts].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  dispatch(setFeed(sortedPosts));
                  console.log('Loaded posts from local storage:', sortedPosts.length);
                }
              }
            } catch (e) {
              console.warn('Failed to parse local posts:', e);
            }
          }
        }
        
        // Then fetch the latest posts from API (server-side PostgreSQL)
        try {
          console.log('Fetching posts from API...');
          setIsRefreshing(true);
          
          const response = await axios.get(`${getApiBaseUrl()}/api/posts`, {
            timeout: 8000, // 8 second timeout
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          setIsRefreshing(false);
          setRetryCount(0); // Reset retry count on success
          
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            // Posts are already sorted in the API
            const posts = response.data;
            
            // Check if we have new posts and update state for notification
            if (reduxPosts.length > 0 && posts.length > reduxPosts.length) {
              setHasNewPosts(true);
            }
            
            // Store the current post count for future comparison
            setLastPostCount(posts.length);
            setLastFetchTime(new Date());
            
            dispatch(setFeed(posts));
            console.log('Loaded posts from API (PostgreSQL):', posts.length);
            
            // Save to localStorage as backup if we're in the browser
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
              } catch (storageError) {
                console.warn('Failed to save posts to localStorage:', storageError);
              }
            }
          }
        } catch (apiError) {
          setIsRefreshing(false);
          console.error('Error fetching posts from API:', apiError);
          
          // Fall back to direct database call if API fails
          try {
            console.log('Trying direct database access as fallback...');
            const databasePosts = await db.getPosts();
            if (databasePosts && databasePosts.length > 0) {
              // Sort posts to ensure newest are at the top
              const sortedPosts = [...databasePosts].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              dispatch(setFeed(sortedPosts));
              console.log('Loaded posts from direct database call:', sortedPosts.length);
              
              // Save to localStorage as backup if we're in the browser
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('giga-aura-posts', JSON.stringify(sortedPosts));
                } catch (storageError) {
                  console.warn('Failed to save posts to localStorage:', storageError);
                }
              }
            } else if (reduxPosts.length === 0) {
              // Only retry if we don't have any posts
              scheduleRetry();
            }
          } catch (dbError) {
            console.error('Error loading posts from database:', dbError);
            // Only retry if we don't have any posts and haven't exceeded retries
            if (reduxPosts.length === 0) {
              scheduleRetry();
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading posts:', error);
        setLoading(false);
        setIsRefreshing(false);
        
        // Fallback to mock posts if everything fails and we have no posts
        if (!reduxPosts || reduxPosts.length === 0) {
          const mockPosts = [
            {
              id: 'mock1',
              authorWallet: walletAddress || '0x123',
              authorUsername: 'gigaaura',
              authorAvatar: '/images/avatar.png',
              content: 'Welcome to GigaAura! This is a demo post.',
              createdAt: new Date().toISOString(),
              likes: 0,
              comments: 0,
              shares: 0,
              likedBy: []
            }
          ];
          dispatch(setFeed(mockPosts));
        }
      }
    };
    
    // Schedule retry logic for API failures
    const scheduleRetry = () => {
      if (retryCount < MAX_RETRIES) {
        console.log(`Scheduling retry ${retryCount + 1}/${MAX_RETRIES} in ${(retryCount + 1) * 3} seconds...`);
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Set new timeout with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadPosts();
        }, (retryCount + 1) * 3000);
      } else {
        console.log('Maximum retry attempts reached');
      }
    };
    
    // Load posts initially
    loadPosts();
    
    // Set up auto-refresh interval (every 5 seconds instead of 30 for more real-time updates)
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        // Only refresh if we're not already refreshing
        if (!isRefreshing) {
          console.log('Auto-refreshing posts...');
          loadPosts();
        } else {
          console.log('Skipping refresh as previous request is still in progress');
        }
      }, 5000); // 5 seconds for real-time effect
    }
    
    // Set up Server-Sent Events for real-time updates
    if (typeof window !== 'undefined' && autoRefresh) {
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
              if (!isRefreshing) {
                loadPosts();
              }
              
              // Show toast notification
              toast.success('New posts available!', {
                id: 'new-posts',
                duration: 3000,
              });
            }
          } catch (error) {
            console.error('Error processing SSE event:', error);
          }
        };
        
        eventSource.onopen = () => {
          console.log('SSE connection established');
        };
        
        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          // Close and try to reconnect after a delay
          eventSource.close();
          setTimeout(() => {
            if (autoRefresh) {
              console.log('Attempting to reconnect to SSE...');
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
    
    // Cleanup interval on component unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Clean up retry timeout if it exists
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Close SSE connection
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [dispatch, autoRefresh, walletAddress, isRefreshing, retryCount, reduxPosts.length]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const handleCreatePost = (content: string, mediaFile?: File): boolean => {
    try {
      if (!walletAddress) {
        toast.error('Please connect your wallet to post');
        return false;
      }
      
      if (!content.trim() && !mediaFile) {
        toast.error('Please add some content to your post');
        return false;
      }
      
      // Add media URL if there's a file (in a real app, this would be uploaded to a server)
      let mediaUrl;
      let mediaType;
      
      if (mediaFile) {
        // Client-side only code for handling media files
        if (typeof window !== 'undefined') {
          // For demo purposes, we're just creating an object URL
          // In a real app, you'd upload this to a server and get a permanent URL
          mediaUrl = URL.createObjectURL(mediaFile);
          mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
        }
      }
      
      // Create a complete post object
      const newPost: Post = {
        id: uuidv4(),
        content,
        authorUsername: username || undefined,
        authorWallet: walletAddress,
        authorAvatar: avatar || undefined,
        mediaUrl,
        mediaType: mediaType as 'image' | 'video' | undefined,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
      };
      
      console.log("CREATING NEW POST:", newPost);
      
      // Create the transaction for Aura Points
      const newTransaction = {
        id: uuidv4(),
        amount: 20, // 20 points for creating a post
        timestamp: new Date().toISOString(),
        action: 'post_created' as const,
        counterpartyName: 'GigaAura',
        counterpartyWallet: 'system'
      };
      
      // IMPORTANT: Save post using the API (server-side PostgreSQL)
      axios.post(`${getApiBaseUrl()}/api/posts`, newPost)
        .then(response => {
          if (response.status === 201) {
            console.log('POST SAVED TO POSTGRESQL DATABASE VIA API SUCCESSFULLY');
          } else {
            console.error('FAILED TO SAVE POST TO POSTGRESQL DATABASE VIA API');
            
            // Fallback to direct database call if API fails
            db.savePost(newPost)
              .then((success: boolean) => {
                if (success) {
                  console.log('POST SAVED TO POSTGRESQL DATABASE DIRECTLY');
                } else {
                  console.error('FAILED TO SAVE POST TO POSTGRESQL DATABASE DIRECTLY');
                }
              })
              .catch((error: Error) => {
                console.error('ERROR SAVING POST TO POSTGRESQL DATABASE DIRECTLY:', error);
              });
          }
        })
        .catch(error => {
          console.error('ERROR SAVING POST TO POSTGRESQL DATABASE VIA API:', error);
          
          // Fallback to direct database call if API fails
          db.savePost(newPost)
            .then((success: boolean) => {
              if (success) {
                console.log('POST SAVED TO POSTGRESQL DATABASE DIRECTLY');
              } else {
                console.error('FAILED TO SAVE POST TO POSTGRESQL DATABASE DIRECTLY');
              }
            })
            .catch((error: Error) => {
              console.error('ERROR SAVING POST TO POSTGRESQL DATABASE DIRECTLY:', error);
            });
        });
      
      // Add the post to Redux IMMEDIATELY so it shows up in the feed
      // Add the new post at the top of the feed
      dispatch(setFeed([newPost, ...reduxPosts]));
      
      // Also add transaction to PostgreSQL database
      if (walletAddress) {
        db.addTransaction(walletAddress, newTransaction)
          .then((success: boolean) => {
            if (success) {
              console.log('TRANSACTION SAVED TO POSTGRESQL DATABASE SUCCESSFULLY');
            } else {
              console.error('FAILED TO SAVE TRANSACTION TO POSTGRESQL DATABASE');
            }
          })
          .catch((error: Error) => {
            console.error('ERROR SAVING TRANSACTION TO POSTGRESQL DATABASE:', error);
          });
        
        // Add transaction to Redux state
        dispatch(addTransaction(newTransaction));
      }
      
      // Manually trigger a refresh to ensure the latest posts are displayed
      axios.get(`${getApiBaseUrl()}/api/posts`)
        .then(response => {
          if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            // Posts are already sorted in the API
            const posts = response.data;
            dispatch(setFeed(posts));
            
            // Save to localStorage as backup
            localStorage.setItem('giga-aura-posts', JSON.stringify(posts));
          }
        })
        .catch(error => {
          console.error('Error refreshing posts after creating new post:', error);
        });
      
      // Success message
      toast.success('Post created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
      return false;
    }
  };

  const handleRefreshFeed = () => {
    setHasNewPosts(false);
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
    
    // Only refresh if we're not already refreshing
    if (!isRefreshing) {
      // Force a refresh
      axios.get(`${getApiBaseUrl()}/api/posts`, {
        timeout: 8000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(response => {
          if (response.data && Array.isArray(response.data)) {
            dispatch(setFeed(response.data));
            setLastPostCount(response.data.length);
            setLastFetchTime(new Date());
            
            // Save to localStorage
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('giga-aura-posts', JSON.stringify(response.data));
              } catch (e) {
                console.warn('Failed to save posts to localStorage:', e);
              }
            }
          }
        })
        .catch(error => {
          console.error('Error refreshing feed:', error);
          toast.error('Could not refresh feed. Will try again soon.');
        });
    } else {
      toast('Refresh already in progress...', {
        duration: 2000,
        style: {
          background: '#3498db',
          color: '#fff',
        },
        icon: '🔄'
      });
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 my-4">
        <h3 className="text-red-800 dark:text-red-400 font-medium">Error loading feed</h3>
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-white bg-red-600 hover:bg-red-700 px-4 py-1 rounded-full text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={feedRef}>
      {/* Feed Header with Tabs */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-[var(--border-color)]">
        <div className="flex">
          <button
            className={`flex-1 py-4 text-center font-medium relative ${
              activeTab === 'for-you' 
                ? 'text-black dark:text-white' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleTabChange('for-you')}
          >
            For you
            {activeTab === 'for-you' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
            )}
          </button>
          <button
            className={`flex-1 py-4 text-center font-medium relative ${
              activeTab === 'following' 
                ? 'text-black dark:text-white' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleTabChange('following')}
          >
            Following
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></div>
            )}
          </button>
        </div>
        
        {/* Add manual refresh button */}
        <div className="absolute right-4 top-4">
          <button
            onClick={handleRefreshFeed}
            className={`text-gray-500 hover:text-black dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
            title="Refresh posts"
            disabled={isRefreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* New Posts Notification */}
      {hasNewPosts && (
        <div 
          className="bg-[#F6B73C] text-white py-2 px-4 text-center cursor-pointer shadow-md hover:bg-[#e5a835] transition-colors border-b border-[var(--border-color)]"
          onClick={handleRefreshFeed}
        >
          New posts available! Click to refresh
        </div>
      )}
      
      {/* Create Post Section */}
      <div className="border-b border-[var(--border-color)] p-4">
        <CreatePostForm onSubmit={handleCreatePost} />
      </div>
      
      {/* Feed Content */}
      <div className="divide-y divide-[var(--border-color)]">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : reduxPosts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xl text-black dark:text-white">No posts yet</p>
            <p className="text-gray-500 mt-2">Create the first post or follow some users to see their posts here!</p>
            <button 
              onClick={handleRefreshFeed}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
            </button>
          </div>
        ) : (
          // Posts are already sorted by created date, newest first in the Redux store
          reduxPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
        
        {/* Loading more indicator at the bottom */}
        {isRefreshing && reduxPosts.length > 0 && (
          <div className="p-4 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export with error boundary
function Feed(props: Record<string, any>) {
  return (
    <FeedErrorBoundary
      fallback={<FeedErrorFallback error={new Error('Failed to load feed')} resetErrorBoundary={() => window.location.reload()} />}
    >
      <FeedSafetyWrapper {...props} />
    </FeedErrorBoundary>
  );
}

export default Feed; 