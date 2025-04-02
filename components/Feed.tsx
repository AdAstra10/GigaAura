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

  // First load - try to get data from cache with multiple fallbacks
  useEffect(() => {
    console.log("LOADING POSTS FROM ALL CACHE SOURCES...");
    
    // 1. FIRST TRY DIRECT LOCALSTORAGE (most reliable)
    try {
      const directFeed = localStorage.getItem('gigaaura_feed');
      if (directFeed) {
        try {
          const parsedDirectFeed = JSON.parse(directFeed);
          if (Array.isArray(parsedDirectFeed) && parsedDirectFeed.length > 0) {
            console.log("FOUND DIRECT CACHE POSTS:", parsedDirectFeed.length);
            dispatch(setFeed(parsedDirectFeed));
            return; // Exit if we successfully loaded
          }
        } catch (e) {
          console.error("Error parsing direct feed:", e);
        }
      }
      
      // 2. TRY BACKUP LOCALSTORAGE
      const backupFeed = localStorage.getItem('gigaaura_feed_backup');
      if (backupFeed) {
        try {
          const parsedBackupFeed = JSON.parse(backupFeed);
          if (Array.isArray(parsedBackupFeed) && parsedBackupFeed.length > 0) {
            console.log("FOUND BACKUP CACHE POSTS:", parsedBackupFeed.length);
            dispatch(setFeed(parsedBackupFeed));
            return; // Exit if we successfully loaded
          }
        } catch (e) {
          console.error("Error parsing backup feed:", e);
        }
      }
    } catch (e) {
      console.error("Error accessing direct localStorage:", e);
    }
    
    // 3. FINALLY, TRY THE REDUX CACHE SERVICE
    console.log("Attempting to load posts from cache service...");
    dispatch(loadFromCache());
  }, [dispatch]);

  // Load posts - separate effect that only runs once after initial load
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        
        // If we have posts in Redux store already, use those
        if (reduxPosts.length > 0) {
          console.log("Using posts from Redux store:", reduxPosts.length);
          setLoading(false);
          return;
        }
        
        console.log("No posts in Redux store, creating mock posts");
        
        // Otherwise, load mock posts for initial state
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Create mock posts as proper Post objects
        const mockPosts: Post[] = [
          {
            id: uuidv4(),
            content: 'Welcome to GigaAura! The future of social networking on blockchain.',
            authorUsername: 'GigaAura',
            authorWallet: '0x1234567890abcdef',
            authorAvatar: undefined,
            mediaUrl: undefined,
            mediaType: undefined,
            likes: 42,
            comments: 7,
            shares: 12,
            createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            likedBy: []
          },
          {
            id: uuidv4(),
            content: 'Just minted my first NFT! Check it out at opensea.io/collection/myawesomenft',
            authorUsername: 'NFTEnthusiast',
            authorWallet: '0xabcdef1234567890',
            authorAvatar: undefined,
            mediaUrl: undefined,
            mediaType: undefined,
            likes: 15,
            comments: 3,
            shares: 2,
            createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            likedBy: []
          },
          {
            id: uuidv4(),
            content: 'This is how Web3 will change everything we know about social media! Thread 🧵👇',
            authorUsername: 'Web3Guru',
            authorWallet: '0x9876543210abcdef',
            authorAvatar: undefined,
            mediaUrl: undefined,
            mediaType: undefined,
            likes: 28,
            comments: 5,
            shares: 8,
            createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
            likedBy: []
          }
        ];
        
        // Add posts to Redux
        console.log("Creating mock posts:", mockPosts.length);
        dispatch(setFeed(mockPosts));
        setError(null);
      } catch (err) {
        console.error('Error loading posts:', err);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only run this effect once on mount, not when reduxPosts changes
    // This fixes the issue where mock posts would replace cached posts
    const onlyRunOnce = true;
    if (onlyRunOnce) {
      loadPosts().catch(err => {
        console.error("Unhandled error in loadPosts:", err);
        showBoundary(err);
      });
    }
  }, [dispatch, showBoundary]); // removed reduxPosts.length from dependencies

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
        // For demo purposes, we're just creating an object URL
        // In a real app, you'd upload this to a server and get a permanent URL
        mediaUrl = URL.createObjectURL(mediaFile);
        mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      }
      
      // Create post object
      const postData = {
        content,
        authorUsername: username || undefined,
        authorWallet: walletAddress,
        authorAvatar: avatar || undefined,
        mediaUrl,
        mediaType: mediaType as 'image' | 'video' | undefined
      };
      
      console.log("CREATING NEW POST WITH DATA:", postData);
      
      // First, create the full post object
      const newPost: Post = {
        ...postData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
      };
      
      // Create the transaction for Aura Points
      const newTransaction = {
        id: uuidv4(),
        amount: 20, // 20 points for creating a post
        timestamp: new Date().toISOString(),
        action: 'post_created' as const,
        counterpartyName: 'GigaAura',
        counterpartyWallet: 'system'
      };
      
      // 1. SAVE DIRECTLY TO LOCALSTORAGE FIRST (most reliable approach)
      // Get current posts from localStorage
      try {
        const currentFeedStr = localStorage.getItem('gigaaura_feed');
        let currentFeed: Post[] = [];
        
        if (currentFeedStr) {
          try {
            currentFeed = JSON.parse(currentFeedStr);
            if (!Array.isArray(currentFeed)) currentFeed = [];
          } catch (e) {
            console.error('Error parsing currentFeed:', e);
            currentFeed = [];
          }
        }
        
        // Add the new post to the beginning of the feed
        const updatedFeed = [newPost, ...currentFeed];
        
        // Save back to localStorage immediately
        console.log('SAVING POSTS DIRECTLY TO LOCALSTORAGE:', updatedFeed.length);
        localStorage.setItem('gigaaura_feed', JSON.stringify(updatedFeed));
        
        // Verify it saved correctly
        const verifyFeed = localStorage.getItem('gigaaura_feed');
        if (verifyFeed) {
          try {
            const parsedFeed = JSON.parse(verifyFeed);
            console.log('DIRECT SAVE VERIFIED:', parsedFeed.length, 'posts in localStorage');
          } catch (e) {
            console.error('Error verifying feed save:', e);
          }
        }
      } catch (e) {
        console.error('Error saving directly to localStorage:', e);
      }
      
      // 2. NOW DISPATCH TO REDUX (this will also trigger the reducer's cache logic)
      console.log('DISPATCHING POST TO REDUX');
      dispatch(addPost(postData));
      
      // 3. ADD TRANSACTION FOR AURA POINTS
      console.log('DISPATCHING TRANSACTION TO REDUX');
      dispatch(addTransaction(newTransaction));
      
      // 4. FORCE SYNC WITH MULTIPLE APPROACHES (belt and suspenders)
      const syncTimeout = setTimeout(() => {
        try {
          // Get current posts from Redux store
          const currentReduxFeed = store.getState().posts.feed;
          console.log('FORCE SYNCING FEED:', currentReduxFeed.length, 'posts');
          
          // Save again via cache service
          cacheFeed(currentReduxFeed);
          
          // Also save user posts
          const currentUserPosts = store.getState().posts.userPosts;
          cacheUserPosts(currentUserPosts);
          
          // Direct save as additional backup
          localStorage.setItem('gigaaura_feed_backup', JSON.stringify(currentReduxFeed));
          
          console.log('COMPLETED ALL SYNC OPERATIONS');
        } catch (e) {
          console.error('Error in sync timeout:', e);
        }
      }, 100);
      
      // Success message
      toast.success('Post created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
      return false;
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
      </div>
      
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
          </div>
        ) : (
          // Sort posts by created date, newest first
          [...reduxPosts]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(post => (
              <PostCard key={post.id} post={post} />
            ))
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