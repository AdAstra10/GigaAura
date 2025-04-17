import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments, loadFromCache, setError, setLoading, saveNewPost } from '../lib/slices/postsSlice';
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

// Typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

// Main Feed component - The entry point for the entire feed system
const Feed: React.FC = () => {
  // No ErrorBoundary needed here if Layout handles it, or keep if specific to Feed
  return <FeedInner />;
};

// Inner feed component with main logic
function FeedInner() { // Removed props drilling for isMetaMaskDetected if not used
  const dispatch = useAppDispatch();
  const { feed: reduxPosts, loading, error } = useSelector((state: RootState) => state.posts);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [endReached, setEndReached] = useState(false); // Assuming pagination/infinite scroll logic exists elsewhere or is TODO
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0); // Keep retry logic if needed
  const feedRef = useRef<HTMLDivElement>(null);
  const { showBoundary } = useErrorBoundary(); // Keep if using ErrorBoundary
  const { connectWallet, connected, walletAddress } = useWallet();
  const { username, avatar, following } = useSelector((state: RootState) => state.user);
  
  // Auto-refresh and real-time state
  const [autoRefresh, setAutoRefresh] = useState(true); // Can be a user setting
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseRef = useRef<EventSource | null>(null); // For Server-Sent Events
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For SSE reconnect
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Removed Pusher refs if SSE is primary method now

  // Filter for following tab
  const filteredPosts = activeTab === 'following' && following?.length > 0
    ? reduxPosts.filter(post => post.authorWallet && following.includes(post.authorWallet))
    : reduxPosts;

  // Function to get API base URL (ensure it works correctly on server/client)
   const getApiBaseUrl = (): string => {
     if (typeof window !== 'undefined') {
       return window.location.origin;
     }
     // Attempt to get base URL on server (replace with actual env var if needed)
     return process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'; 
   };

  // Load initial posts from localStorage if available
  useEffect(() => {
    try {
      const cachedPosts = localStorage.getItem('giga-aura-posts');
      if (cachedPosts) {
        const posts: Post[] = JSON.parse(cachedPosts);
        if (Array.isArray(posts) && posts.length > 0 && reduxPosts.length === 0) { // Only load if Redux is empty
          console.log('Loaded', posts.length, 'posts from localStorage on initial mount');
          dispatch(setFeed(posts));
        }
      }
    } catch (error) {
      console.error('Error loading posts from localStorage:', error);
    }
  }, [dispatch]); // Only run once on mount

  // --- Load Posts Logic (Combined Initial Load & Refresh) --- 
  const loadPosts = useCallback(async (isManualRefresh = false) => {
     if (isRefreshing && !isManualRefresh) return; // Prevent overlapping auto-refreshes
     
     setIsRefreshing(true);
     if (isManualRefresh) {
       setHasNewPosts(false); // Clear banner on manual refresh
       dispatch(setLoading(true)); // Show loading state for manual refresh
     } else {
       // Only show loading state on initial load, not auto-refresh
       if (reduxPosts.length === 0) {
         dispatch(setLoading(true));
       }
     }
     
     let existingPosts: Post[] = [];
     try {
       // Get existing posts from localStorage as a base
       const cachedPosts = localStorage.getItem('giga-aura-posts');
       if (cachedPosts) {
         existingPosts = JSON.parse(cachedPosts);
         if (!Array.isArray(existingPosts)) existingPosts = []; // Ensure it's an array
       }
     } catch (e) {
       console.error('Error reading posts from localStorage:', e);
     }

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
         mode: 'same-origin', // Or 'cors' if API is elsewhere
         credentials: 'same-origin', // Adjust if needed
       });
       
       if (!response.ok) {
         throw new Error(`API responded with status: ${response.status}`);
       }
       
       const data = await response.json();
       
       if (Array.isArray(data)) {
         // Merge API data with existing localStorage data
         const postMap = new Map<string, Post>();
         
         // Add API posts first (newer)
         data.forEach(post => {
           if (post && post.id) postMap.set(post.id, post);
         });
         
         // Add existing posts not present in API response
         existingPosts.forEach(post => {
           if (post && post.id && !postMap.has(post.id)) {
             postMap.set(post.id, post);
           }
         });
         
         const mergedPosts = Array.from(postMap.values());
         // Sort merged posts by date (newest first)
         mergedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

         dispatch(setFeed(mergedPosts));
         
         // Update localStorage cache
         try {
           localStorage.setItem('giga-aura-posts', JSON.stringify(mergedPosts));
           console.log('Saved merged', mergedPosts.length, 'posts to localStorage');
         } catch (cacheError) {
           console.error('Error saving posts to localStorage:', cacheError);
         }

         if (isManualRefresh) toast.success('Feed updated!');

       } else {
         console.warn('API returned non-array data, keeping existing posts:', data);
         // If API fails but we have cached posts, keep them
         if (existingPosts.length > 0 && reduxPosts.length === 0) {
            dispatch(setFeed(existingPosts));
         }
          if (isManualRefresh) toast.error('Could not update feed.');
       }
     } catch (error) {
       console.error('Error loading/refreshing posts:', error);
       if (isManualRefresh) toast.error('Error refreshing feed');
       setRetryCount(prev => prev + 1); // Increment retry count if needed
       
       // On error, ensure we still have data from localStorage if Redux is empty
       if (existingPosts.length > 0 && reduxPosts.length === 0) {
         dispatch(setFeed(existingPosts));
         console.log('Restored', existingPosts.length, 'posts from localStorage after load error');
       }
     } finally {
       dispatch(setLoading(false));
       setIsRefreshing(false);
     }
   }, [dispatch, isRefreshing, reduxPosts.length]); // Add dependencies


  // --- Effect for Initial Load & Real-time Updates --- 
  useEffect(() => {
    // Initial load
    if (reduxPosts.length === 0) {
       loadPosts();
     }

    // Set up SSE for real-time updates
    let sseCleanup: (() => void) | null = null;
    if (autoRefresh && typeof window !== 'undefined' && !sseRef.current) {
       const connectSSE = () => {
         try {
           console.log('Attempting to connect to SSE...');
           const eventSource = new EventSource(`${getApiBaseUrl()}/api/events`);
           sseRef.current = eventSource;
           
           eventSource.onmessage = (event) => {
             if (event.data) {
               try {
                 const data = JSON.parse(event.data);
                 if (data.type === 'new-post') {
                   setHasNewPosts(true);
                   // Optionally add post directly for instant update?
                   // if (data.post) dispatch(addPost(data.post));
                   console.log('SSE: New post detected');
                 } else if (data.type === 'update-post') {
                   // Handle post updates (likes, comments)
                   console.log('SSE: Post update detected', data.post);
                   // Find and update post in Redux store
                   const updatedPost = data.post;
                   if (updatedPost && updatedPost.id) {
                      dispatch(setFeed(reduxPosts.map(p => p.id === updatedPost.id ? updatedPost : p)));
                      // Update local storage too
                      // ... (localStorage update logic needed)
                   }
                 }
               } catch (e) {
                 console.error('Error parsing SSE event:', e);
               }
             }
           };
           
           eventSource.onerror = () => {
             console.error('SSE connection error. Closing and attempting reconnect.');
             eventSource.close();
             sseRef.current = null;
             if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
             // Simple reconnect delay
             retryTimeoutRef.current = setTimeout(() => {
               if (autoRefresh) connectSSE();
             }, 5000);
           };

           eventSource.onopen = () => {
             console.log('SSE connection established.');
             if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); // Clear retry timeout on successful open
           };

           sseCleanup = () => {
             console.log('Cleaning up SSE connection.');
             eventSource.close();
             sseRef.current = null;
             if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
           };

         } catch (error) {
           console.error('Error setting up SSE:', error);
         }
       };
       connectSSE();
     }

    // Set up polling as fallback or primary refresh mechanism
    if (autoRefresh && !sseRef.current) { // Only poll if SSE isn't active
       if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
       refreshIntervalRef.current = setInterval(() => {
         loadPosts();
       }, 60000); // Poll every minute
     }
    
    // Cleanup on unmount or when autoRefresh changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (sseCleanup) {
         sseCleanup();
       }
    };
  }, [dispatch, autoRefresh, loadPosts, reduxPosts.length]); // Add loadPosts and reduxPosts.length


  // Function to handle post submission from CreatePostForm
  const handlePostSubmit = async (content: string, mediaFile?: File): Promise<boolean> => {
     if (!walletAddress || (!content.trim() && !mediaFile)) {
       toast.error("Cannot create an empty post.");
       return false;
     }

     const postData = {
       content,
       mediaUrl: null, // Will be set after upload if mediaFile exists
       mediaType: mediaFile?.type.startsWith('image/') ? 'image' as const : 
                  mediaFile?.type.startsWith('video/') ? 'video' as const : null,
       // Pass the file itself for the thunk to handle upload
       mediaFile: mediaFile 
     };

     try {
       // Dispatch the async thunk
       const resultAction = await dispatch(saveNewPost(postData));
       
       if (saveNewPost.fulfilled.match(resultAction)) {
         toast.success('Post created successfully!');
         return true; // Indicate success to clear form
       } else {
         // Handle rejection: resultAction.payload should contain error info
         const errorMsg = typeof resultAction.payload === 'string' 
           ? resultAction.payload 
           : 'Failed to create post. Please try again.';
         toast.error(errorMsg);
         console.error('Post creation failed:', resultAction.payload);
         return false; // Indicate failure
       }
     } catch (err) { // Catch unexpected errors during dispatch
       console.error('Error dispatching saveNewPost:', err);
       toast.error('An unexpected error occurred while posting.');
       return false; // Indicate failure
     }
   };

  // --- JSX Rendering --- 
  return (
    <div className="w-full">
      {/* Tab navigation - "For you" and "Following" tabs */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`flex-1 py-4 text-center font-medium transition-colors duration-200 ${activeTab === 'for-you' ? 'text-black dark:text-white border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
          >
            For you
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-4 text-center font-medium transition-colors duration-200 ${activeTab === 'following' ? 'text-black dark:text-white border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
          >
            Following
          </button>
        </div>
      </div>
      
      {/* New Post Form - Now uses the refactored component */} 
      {/* Apply top border here if needed, or let CreatePostForm handle its bottom border */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <CreatePostForm onSubmit={handlePostSubmit} />
      </div>
      
      {/* Show "New posts" banner if there are new posts */} 
      {hasNewPosts && (
        <button
          onClick={() => loadPosts(true)} // Pass true for manual refresh
          className="w-full flex items-center justify-center py-3 bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          New posts available - Click to load
        </button>
      )}
      
      {/* Feed content */} 
      <div ref={feedRef} className="divide-y divide-gray-200 dark:divide-gray-800">
        {(loading && reduxPosts.length === 0) ? (
          // Show skeletons only on initial load
          <div>
            {[...Array(5)].map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          // Show error state
          <div className="p-4 py-10 text-center">
             <p className="text-red-500 mb-4">Error loading posts. Please try again.</p>
            <button 
              onClick={() => loadPosts(true)} // Pass true for manual refresh
              className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors text-sm"
            >
               <ArrowPathIcon className="h-4 w-4 inline mr-1"/> Retry
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          // Empty state
          <div className="py-10 text-center px-4">
            {activeTab === 'following' ? (
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                  No posts from accounts you follow
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Posts from accounts you follow will show up here.
                </p>
                <button
                  onClick={() => setActiveTab('for-you')}
                  className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors"
                >
                  Explore Posts
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                  Welcome to GigaAura!
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  It's quiet right now... maybe create the first post?
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
                comments={post.comments || []} // Ensure comments array is passed
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
                You've reached the end
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Removed FeedSafetyWrapper as it might be unnecessary complexity now
// If needed, re-introduce it carefully.

export default Feed;