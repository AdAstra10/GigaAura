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
import db from '../services/db';
import { listenToPosts, getPosts, cleanupAllListeners } from '../services/db';

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

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      try {
        // First try to load posts from localStorage for immediate display
        const localPostsString = localStorage.getItem('giga-aura-posts');
        if (localPostsString) {
          try {
            const localPosts = JSON.parse(localPostsString);
            if (Array.isArray(localPosts) && localPosts.length > 0) {
              dispatch(setFeed(localPosts));
              console.log('Loaded posts from local storage:', localPosts.length);
            }
          } catch (e) {
            console.warn('Failed to parse local posts:', e);
          }
        }
        
        // Then fetch the latest posts from Firestore
        const firebasePosts = await getPosts();
        if (firebasePosts && firebasePosts.length > 0) {
          dispatch(setFeed(firebasePosts));
          console.log('Loaded posts from Firebase:', firebasePosts.length);
          
          // Save to localStorage as backup
          localStorage.setItem('giga-aura-posts', JSON.stringify(firebasePosts));
        }
        
        // Set up real-time listener for post updates
        const unsubscribe = listenToPosts((updatedPosts) => {
          if (updatedPosts && updatedPosts.length > 0) {
            dispatch(setFeed(updatedPosts));
            console.log('Real-time posts update:', updatedPosts.length);
            
            // Update localStorage backup
            localStorage.setItem('giga-aura-posts', JSON.stringify(updatedPosts));
          }
        });
        
        setLoading(false);
        
        // Cleanup function to remove listener when component unmounts
        return () => {
          console.log('Cleaning up Feed listeners');
          unsubscribe();
          cleanupAllListeners();
        };
      } catch (error) {
        console.error('Error loading posts:', error);
        setLoading(false);
        
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
    
    loadPosts();
  }, [dispatch, walletAddress]);

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
      
      // Create a complete post object (not just the data)
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
      
      // IMPORTANT: First save post to Firestore
      db.savePost(newPost)
        .then(success => {
          if (success) {
            console.log('POST SAVED TO CLOUD DATABASE SUCCESSFULLY');
          } else {
            console.error('FAILED TO SAVE POST TO CLOUD DATABASE');
          }
        })
        .catch(error => {
          console.error('ERROR SAVING POST TO CLOUD:', error);
        });
      
      // Add the post to Redux IMMEDIATELY so it shows up in the feed
      dispatch(setFeed([newPost, ...reduxPosts]));
      
      // Also add transaction to Firestore
      if (walletAddress) {
        db.addTransaction(walletAddress, newTransaction)
          .then(success => {
            if (success) {
              console.log('TRANSACTION SAVED TO CLOUD DATABASE SUCCESSFULLY');
            } else {
              console.error('FAILED TO SAVE TRANSACTION TO CLOUD DATABASE');
            }
          })
          .catch(error => {
            console.error('ERROR SAVING TRANSACTION TO CLOUD:', error);
          });
        
        // Add transaction to Redux state
        dispatch(addTransaction(newTransaction));
      }
      
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