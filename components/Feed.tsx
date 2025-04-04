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
import pusherClient, { PUSHER_CHANNELS, PUSHER_EVENTS } from '../lib/pusher';

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
  const pusherChannelRef = useRef<any>(null);

  // Add this CSS class after the imports for Twitter Blue color
  const twitterBlue = "text-[#1D9BF0] dark:text-[#1D9BF0]";

  // Main useEffect for loading posts
  useEffect(() => {
    const loadPosts = async () => {
      // Only fetch if we're not already refreshing
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
        
        // Finally, fetch from API using fetch API with proper CORS
        console.log('Fetching posts from API using fetch...');
        try {
          const timestamp = new Date().getTime();
          const apiUrl = `${window.location.origin}/api/posts?t=${timestamp}`;
          console.log('API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Accept': 'application/json',
            },
            mode: 'same-origin', // Important for security and to avoid CORS
            credentials: 'same-origin',
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            dispatch(setFeed(data));
            
            // Save to localStorage
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('giga-aura-posts', JSON.stringify(data));
              } catch (e) {
                console.warn('Failed to save posts to localStorage:', e);
              }
            }
            
            setLastPostCount(data.length);
            console.log(`Loaded ${data.length} posts from API`);
          } else {
            console.log('API returned no posts or invalid format', data);
            
            // Check if we need to use direct DB access as fallback
            if (reduxPosts.length === 0 && typeof window !== 'undefined') {
              console.log('Trying direct database access...');
              try {
                const dbPosts = await db.getPosts();
                if (dbPosts && Array.isArray(dbPosts) && dbPosts.length > 0) {
                  dispatch(setFeed(dbPosts));
                  setLastPostCount(dbPosts.length);
                  console.log(`Loaded ${dbPosts.length} posts directly from database`);
                  
                  // Also try to save to localStorage
                  localStorage.setItem('giga-aura-posts', JSON.stringify(dbPosts));
                }
              } catch (dbError) {
                console.error('Direct database access also failed:', dbError);
              }
            }
          }
        } catch (fetchError) {
          console.error('Fetch API error:', fetchError);
          
          // Fallback to direct database access
          if (reduxPosts.length === 0 && typeof window !== 'undefined') {
            console.log('Trying direct database access after fetch failure...');
            try {
              const dbPosts = await db.getPosts();
              if (dbPosts && Array.isArray(dbPosts) && dbPosts.length > 0) {
                dispatch(setFeed(dbPosts));
                setLastPostCount(dbPosts.length);
                console.log(`Loaded ${dbPosts.length} posts directly from database`);
                
                // Also try to save to localStorage
                localStorage.setItem('giga-aura-posts', JSON.stringify(dbPosts));
              }
            } catch (dbError) {
              console.error('Direct database access also failed:', dbError);
              
              // If still no posts, show a friendly error
              if (reduxPosts.length === 0) {
                setError('Unable to load posts at this time. Please try again later.');
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading posts:', error);
        setError(`Failed to load posts. ${error.message || 'Please try again later.'}`);
        
        // If we've tried less than MAX_RETRIES times, try again after a delay
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying fetch (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
          setRetryCount(retryCount + 1);
          
          retryTimeoutRef.current = setTimeout(() => {
            loadPosts();
          }, 3000);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setLastFetchTime(new Date());
      }
    };
    
    // Load posts on component mount
    loadPosts();
    
    // If autoRefresh is enabled, set up interval to periodically reload posts
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isRefreshing) {
          console.log('Auto-refreshing feed...');
          loadPosts();
        }
      }, 10000); // Refresh every 10 seconds (was 60000)
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

  // Set up Pusher for real-time updates (after loadPosts is defined)
  useEffect(() => {
    // Get reference to the loadPosts function for Pusher updates
    const refreshPosts = async () => {
      // Only fetch if we're not already refreshing
      if (!isRefreshing) {
        console.log('Pusher triggered post refresh');
        
        try {
          setIsRefreshing(true);
          // Use current origin to avoid CORS issues
          const apiUrl = `${getApiBaseUrl()}/api/posts`;
          
          // Add timestamp to bust cache
          const timestamp = new Date().getTime();
          
          const response = await fetch(`${apiUrl}?t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Accept': 'application/json',
            },
            mode: 'same-origin', // Important for security and to avoid CORS
            credentials: 'same-origin',
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data) {
            throw new Error('API returned empty response');
          }
          
          if (Array.isArray(data) && data.length > 0) {
            console.log(`Loaded ${data.length} posts from API via Pusher refresh`);
            dispatch(setFeed(data));
            
            // Save to localStorage
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('giga-aura-posts', JSON.stringify(data));
              } catch (e) {
                console.warn('Failed to save posts to localStorage:', e);
              }
            }
          } else if (Array.isArray(data)) {
            console.log('API returned empty posts array');
            // Don't update feed with empty array to avoid clearing existing posts
          } else {
            console.warn('API returned invalid data format:', data);
            throw new Error('Invalid data format received from API');
          }
        } catch (error) {
          console.error('Error refreshing posts from Pusher event:', error);
          // Show toast notification for better user feedback
          toast.error('Something went wrong loading the feed. Trying alternate sources...');
          
          // Fallback to direct DB call if API fails
          try {
            console.log('Attempting to fetch posts directly from database...');
            const dbPosts = await db.getPosts();
            if (dbPosts && Array.isArray(dbPosts) && dbPosts.length > 0) {
              console.log(`Loaded ${dbPosts.length} posts directly from database after API failure`);
              dispatch(setFeed(dbPosts));
              
              // Save to localStorage
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('giga-aura-posts', JSON.stringify(dbPosts));
                } catch (e) {
                  console.warn('Failed to save posts to localStorage:', e);
                }
              }
            } else {
              // Try loading from localStorage as last resort
              if (typeof window !== 'undefined') {
                try {
                  const cachedPosts = localStorage.getItem('giga-aura-posts');
                  if (cachedPosts) {
                    const parsedPosts = JSON.parse(cachedPosts);
                    if (Array.isArray(parsedPosts) && parsedPosts.length > 0) {
                      console.log(`Loaded ${parsedPosts.length} posts from localStorage cache`);
                      dispatch(setFeed(parsedPosts));
                    }
                  }
                } catch (e) {
                  console.warn('Failed to load posts from localStorage:', e);
                }
              }
            }
          } catch (dbError) {
            console.error('Failed to load posts directly from database:', dbError);
          }
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    
    // Subscribe to Pusher channel for real-time updates
    try {
      if (typeof window !== 'undefined') {
        console.log('Setting up Pusher subscription for posts channel');
        
        const channel = pusherClient.subscribe(PUSHER_CHANNELS.POSTS);
        pusherChannelRef.current = channel;
        
        // Listen for new posts
        channel.bind(PUSHER_EVENTS.NEW_POST, (data: any) => {
          console.log('Received new post via Pusher:', data);
          if (data && data.id) {
            // Add the new post to the Redux store immediately
            dispatch(addPost(data));
            
            // Show notification of new posts
            setHasNewPosts(true);
            
            // For instant updates without full refresh, just add the new post to Redux
            // This avoids the need to wait for the next refresh interval
            
            // Show toast notification
            toast.success('New post received!', {
              id: 'new-post-' + data.id,
              duration: 3000,
            });
            
            // Refresh in background without setting loading state
            // This ensures we get other recent posts as well
            const quietRefresh = async () => {
              try {
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
                
                if (response.ok) {
                  const posts = await response.json();
                  if (Array.isArray(posts) && posts.length > 0) {
                    dispatch(setFeed(posts));
                  }
                }
              } catch (error) {
                console.error('Error in quiet refresh:', error);
              }
            };
            
            // Perform background refresh
            quietRefresh();
          }
        });
        
        // Listen for post updates
        channel.bind(PUSHER_EVENTS.UPDATED_POST, (data: any) => {
          console.log('Received updated post via Pusher:', data);
          if (data && data.id) {
            // Add the updated post to the Redux store
            dispatch(addPost(data));
            // Refresh the list to ensure consistency with database
            refreshPosts();
          }
        });
        
        // Setup diagnostics listener
        channel.bind(PUSHER_EVENTS.TEST, (data: any) => {
          console.log('Received test event via Pusher:', data);
        });
        
        // Setup error handling
        channel.bind('pusher:subscription_error', (status: any) => {
          console.error('Pusher subscription error:', status);
          if (status === 403) {
            console.error('Authentication required for this channel');
          }
        });
      }
    } catch (error) {
      console.error('Error setting up Pusher subscription:', error);
    }
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      try {
        if (pusherChannelRef.current) {
          console.log('Cleaning up Pusher subscription');
          pusherClient.unsubscribe(PUSHER_CHANNELS.POSTS);
          pusherChannelRef.current = null;
        }
      } catch (error) {
        console.error('Error cleaning up Pusher subscription:', error);
      }
    };
  }, [dispatch, isRefreshing]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Function to handle creating a new post
  const handleCreatePost = (content: string, mediaFile?: File): boolean => {
    if (!content.trim()) {
      toast.error('Post content cannot be empty');
        return false;
      }
      
    if (!walletAddress) {
      toast.error('Please connect your wallet to create a post');
        return false;
      }
      
    try {
      // Generate a new unique ID for the post
      const postId = uuidv4();
      console.log('Creating new post with ID:', postId);
      
      // Create post to save to PostgreSQL via API
      const newPost: Post = {
        id: postId,
        content: content,
        authorWallet: walletAddress,
        authorUsername: username || undefined,
        authorAvatar: avatar || undefined,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
      };
      
      // Show toast notification that post is being created
      toast.loading('Creating post...', { id: postId });
      
      // IMPORTANT: Save post using the API (server-side PostgreSQL with Pusher integration)
      fetch(`${getApiBaseUrl()}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify(newPost),
        mode: 'same-origin',
        credentials: 'same-origin',
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
      })
      .then(data => {
        console.log('POST SAVED TO POSTGRESQL DATABASE VIA API SUCCESSFULLY', data);
        toast.dismiss(postId);
        toast.success('Post created successfully!');
        
        // If Pusher event was not triggered, add the post manually
        const savedPost = data.data || newPost;
        
        // Add to Redux store immediately to ensure the post is visible
        dispatch(addPost(savedPost));
        
        if (!data.pusherEvent) {
          console.log('Pusher event not triggered, manually updating UI');
        }
        
        // Force a refresh of the posts list after a short delay
        setTimeout(() => {
          if (autoRefresh && !isRefreshing) {
            console.log('Forcing refresh to ensure post is visible');
            setHasNewPosts(false); // Hide the notification banner if shown
            
            // Trigger a refresh of the posts
            fetch(`${getApiBaseUrl()}/api/posts?t=${new Date().getTime()}`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Accept': 'application/json',
              },
              mode: 'same-origin',
              credentials: 'same-origin',
            })
            .then(response => response.json())
            .then(posts => {
              if (Array.isArray(posts)) {
                console.log(`Loaded ${posts.length} posts after creating new post`);
                dispatch(setFeed(posts));
                
                // Check if our new post is in the list
                const newPostFound = posts.some(p => p.id === postId);
                if (!newPostFound) {
                  console.warn('New post not found in refreshed posts list, may need to add manually');
                } else {
                  console.log('New post confirmed in refreshed posts list');
                }
              }
            })
            .catch(error => {
              console.error('Error refreshing posts:', error);
            });
          }
        }, 1000);
      })
      .catch(error => {
        console.error('ERROR SAVING POST TO POSTGRESQL DATABASE VIA API:', error);
        toast.dismiss(postId);
        toast.error('Error saving post to database');
        
        // Fallback to direct database call if API fails
        db.savePost(newPost)
          .then((success: boolean) => {
            if (success) {
              console.log('POST SAVED TO POSTGRESQL DATABASE DIRECTLY');
              toast.success('Post created successfully (fallback)');
              
              // Add the post to Redux manually since we bypassed the API
              dispatch(addPost(newPost));
            } else {
              console.error('FAILED TO SAVE POST TO POSTGRESQL DATABASE DIRECTLY');
              toast.error('Failed to save post to database');
            }
          })
          .catch((dbError: Error) => {
            console.error('ERROR SAVING POST TO POSTGRESQL DATABASE DIRECTLY:', dbError);
            toast.error('Error creating post. Please try again.');
          });
      });
      
      // Create an aura points transaction for creating a post
      const transactionId = uuidv4();
      const transaction = {
        id: transactionId,
        walletAddress: walletAddress,
        amount: 1, // +1 for creating a post
        action: 'post_created' as const,
        timestamp: new Date().toISOString(),
        counterpartyName: 'GigaAura',
        counterpartyWallet: 'system'
      };
      
      // Dispatch transaction to Redux
      dispatch(addTransaction(transaction));
      
      // Create a notification for the post
      const notificationId = uuidv4();
      const notification = {
        id: notificationId,
        walletAddress: walletAddress,
        type: 'system' as const,
        message: 'You earned 1 Aura Point for creating a post',
        read: false,
        timestamp: new Date().toISOString(),
        postId: postId,
      };
      
      // Dispatch notification to Redux
      dispatch(addNotification(notification));
      
      // Success! Clear the form input
      setNewPostContent('');
      
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      
      // Show error notification
      toast.error('Error creating post. Please try again.');
      
      return false;
    }
  };

  // Render filtered posts based on active tab
  const renderPosts = () => {
    if (loading) {
      return (
        <div className="w-full flex justify-center items-center py-8">
          <div className="animate-pulse flex flex-col w-full space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      );
    }

  if (error) {
    return (
        <div className="w-full flex justify-center items-center py-8">
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
        <button 
              className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover"
              onClick={() => {
                setError(null);
                setRetryCount(0);
              }}
            >
              Try Again
        </button>
          </div>
        </div>
      );
    }

    // Filter posts based on active tab
    let filteredPosts = [...reduxPosts];
    
    if (activeTab === 'for-you') {
      // For You tab: Show all posts, sorted by recency
      filteredPosts = filteredPosts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (activeTab === 'following') {
      // Following tab: Filter to only show posts from accounts the user is following
      // TODO: Implement following logic; for now, just show the user's own posts
      filteredPosts = filteredPosts.filter(post => post.authorWallet === walletAddress);
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="w-full flex justify-center items-center py-8">
          <div className="text-center">
            <p className="mb-4 text-[var(--text-primary)]">No posts to display.</p>
            {activeTab === 'following' && (
              <p className="text-sm text-[var(--text-secondary)]">
                Follow other users to see their posts here.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          // Add safety checks for post data
          if (!post) return null;
          
          // Make sure post has all required properties
          const safePost = {
            ...post,
            authorUsername: post.authorUsername || 'Anonymous',
            authorName: post.authorName || 'Anonymous',
            authorAvatar: post.authorAvatar || '/assets/avatars/default-avatar.png', // Use a local default avatar
            authorWallet: post.authorWallet || '',
            content: post.content || '',
            createdAt: post.createdAt || new Date().toISOString(),
            likes: post.likes || 0,
            comments: typeof post.comments === 'number' ? post.comments : 0,
            shares: post.shares || 0,
            likedBy: post.likedBy || [],
          };
          
          return <PostCard key={post.id} post={safePost} />;
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* New Post Banner */}
      {hasNewPosts && (
        <div 
          className="sticky top-16 z-10 w-full bg-[#1D9BF0] text-white py-2 px-4 rounded-lg mb-4 cursor-pointer flex items-center justify-center shadow-sm"
          onClick={() => {
            setHasNewPosts(false);
            // Force a refresh
            axios.get(`${getApiBaseUrl()}/api/posts`)
              .then(response => {
                if (response.data && Array.isArray(response.data)) {
                  dispatch(setFeed(response.data));
                }
              })
              .catch(error => {
                console.error('Error refreshing feed:', error);
              });
          }}
        >
          <div className="flex items-center">
            <FaRegListAlt className="mr-2" />
            <span>New posts available! Click to refresh</span>
          </div>
        </div>
      )}

      {/* Tab selector - Twitter style */}
      <div className="flex border-b dark:border-gray-800 mb-3">
          <button
          className={`relative flex-1 py-4 font-bold text-center ${
              activeTab === 'for-you' 
                ? 'text-black dark:text-white' 
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900/30'
            }`}
            onClick={() => handleTabChange('for-you')}
          >
          For You
            {activeTab === 'for-you' && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-[#1D9BF0] rounded-full"></div>
            )}
          </button>
          <button
          className={`relative flex-1 py-4 font-bold text-center ${
              activeTab === 'following' 
                ? 'text-black dark:text-white' 
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900/30'
            }`}
            onClick={() => handleTabChange('following')}
          >
            Following
            {activeTab === 'following' && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-[#1D9BF0] rounded-full"></div>
            )}
          </button>
      </div>
      
      {/* Create post form */}
      <div className="mb-4">
        <CreatePostForm onSubmit={handleCreatePost} />
      </div>
      
      {/* Posts feed */}
      <div ref={feedRef} className="space-y-3">
        {renderPosts()}
      </div>
    </div>
  );
}

// Main feed component (add error boundary)
export default function Feed({ isMetaMaskDetected }: { isMetaMaskDetected?: boolean }) {
  return (
    <FeedErrorBoundary
      fallback={<FeedErrorFallback error={new Error('Failed to load feed')} resetErrorBoundary={() => window.location.reload()} />}
    >
      <FeedSafetyWrapper isMetaMaskDetected={isMetaMaskDetected} />
    </FeedErrorBoundary>
  );
}