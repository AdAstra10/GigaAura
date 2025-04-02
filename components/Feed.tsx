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
  const { connectWallet, connected, walletAddress } = useWallet();
  const { username, avatar } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  
  // Get posts from Redux store
  const reduxPosts = useSelector((state: RootState) => state.posts.feed);
  const reduxComments = useSelector((state: RootState) => state.posts.comments);

  // First load - try to get data from cache
  useEffect(() => {
    dispatch(loadFromCache());
  }, [dispatch]);

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        
        // If we have posts in Redux store already, use those
        if (reduxPosts.length > 0) {
          setLoading(false);
          return;
        }
        
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
        dispatch(setFeed(mockPosts));
        setError(null);
      } catch (err) {
        console.error('Error loading posts:', err);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPosts().catch(err => {
      showBoundary(err);
    });
  }, [dispatch, reduxPosts.length, showBoundary]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }
    
    if (!connected || !walletAddress) {
      toast.error('Please connect your wallet to create a post');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create a new post object
      const newPost: Post = {
        id: uuidv4(),
        content: newPostContent,
        authorUsername: username || truncateWallet(walletAddress),
        authorWallet: walletAddress,
        authorAvatar: avatar || undefined,
        mediaUrl: undefined,
        mediaType: undefined,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date().toISOString(),
        likedBy: []
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add post to the Redux store - this will make it available for all users
      dispatch(addPost(newPost));
      
      // Add transaction for earning Aura Points
      dispatch(addTransaction({
        id: uuidv4(),
        amount: 10,
        timestamp: new Date().toISOString(),
        action: 'post_created',
        counterpartyName: undefined,
        counterpartyWallet: undefined
      }));
      
      // Clear the input field
      setNewPostContent('');
      
      // Show success notification
      toast.success('Post created successfully!');
      
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      toast.error('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to truncate wallet addresses
  const truncateWallet = (wallet: string) => {
    if (!wallet) return '';
    return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
  };

  // Handle share post functionality
  const handleSharePost = (postId: string) => {
    // Implement sharing functionality
    toast.success('Post shared!');
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
    <div ref={feedRef} className="feed-container fixed-width-container">
      {/* Tabs - use a fixed height to prevent layout shift */}
      <div className="sticky top-0 bg-light dark:bg-dark z-10 thin-border border-b h-14">
        <div className="flex h-full">
          <button
            className={`flex-1 flex items-center justify-center font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 relative ${
              activeTab === 'for-you' ? 'font-bold' : ''
            }`}
            onClick={() => handleTabChange('for-you')}
          >
            For you
            {activeTab === 'for-you' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full bg-primary" />
            )}
          </button>
          <button
            className={`flex-1 flex items-center justify-center font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 relative ${
              activeTab === 'following' ? 'font-bold' : ''
            }`}
            onClick={() => handleTabChange('following')}
          >
            Following
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Create Post */}
      <div className="p-4 thin-border border-b">
        <div className="flex space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
            {connected && avatar ? (
              <img 
                src={avatar} 
                alt={username || 'User'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                {connected && username ? username.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div className="flex-grow">
            <textarea
              placeholder="What's happening?"
              className="w-full p-2 bg-transparent text-black dark:text-white border-b border-[var(--border-color)] focus:outline-none focus:border-primary resize-none"
              rows={2}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              disabled={!connected}
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-2 text-primary">
                <button 
                  className="hover:bg-primary/10 p-2 rounded-full"
                  disabled={!connected}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.75 2H4.25C3.01 2 2 3.01 2 4.25v15.5C2 20.99 3.01 22 4.25 22h15.5c1.24 0 2.25-1.01 2.25-2.25V4.25C22 3.01 20.99 2 19.75 2zM4.25 3.5h15.5c.413 0 .75.337.75.75v9.676l-3.858-3.858c-.14-.14-.33-.22-.53-.22h-.003c-.2 0-.393.08-.532.224l-4.317 4.384-1.813-1.806c-.14-.14-.33-.22-.53-.22-.193-.03-.395.08-.535.227L3.5 17.642V4.25c0-.413.337-.75.75-.75zm-.744 16.28l5.418-5.534 6.282 6.254H4.25c-.402 0-.727-.322-.744-.72zm16.244.72h-2.42l-5.007-4.987 3.792-3.85 4.385 4.384v3.703c0 .413-.337.75-.75.75z"></path>
                  </svg>
                </button>
                <button 
                  className="hover:bg-primary/10 p-2 rounded-full"
                  disabled={!connected}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 10.5V8.8h-4.4v6.4h1.7v-2h2v-1.7h-2v-1H19zm-7.3-1.7h1.7v6.4h-1.7V8.8zm-3.6 1.6c.4 0 .9.2 1.2.5l1.2-1C9.9 9.2 9 8.8 8.1 8.8c-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2c1 0 1.8-.4 2.4-1.1v-2.5H7.7v1.2h1.2v.6c-.2.1-.5.2-.8.2-.9 0-1.6-.7-1.6-1.6 0-.8.7-1.6 1.6-1.6z"></path>
                    <path d="M20.5 2.02h-17c-1.24 0-2.25 1.007-2.25 2.247v15.507c0 1.238 1.01 2.246 2.25 2.246h17c1.24 0 2.25-1.008 2.25-2.246V4.267c0-1.24-1.01-2.247-2.25-2.247zm.75 17.754c0 .41-.336.746-.75.746h-17c-.414 0-.75-.336-.75-.746V4.267c0-.412.336-.747.75-.747h17c.414 0 .75.335.75.747v15.507z"></path>
                  </svg>
                </button>
              </div>
              <button 
                className={`${newPostContent.trim() && connected ? 'bg-primary hover:bg-primary-hover' : 'bg-primary/50 cursor-not-allowed'} text-white font-bold py-1.5 px-4 rounded-full`}
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || !connected}
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <div>
          {reduxPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.8 7.2H5.6V3.9c0-.4-.3-.8-.8-.8s-.7.4-.7.8v3.3H.8c-.4 0-.8.3-.8.8s.3.8.8.8h3.3v3.3c0 .4.3.8.8.8s.8-.3.8-.8V8.7H9c.4 0 .8-.3.8-.8s-.5-.7-1-.7zm15-4.9v-.1h-.1c-.1 0-9.2 1.2-14.4 11.7-3.8 7.6-3.6 9.9-3.3 9.9.3.1 3.4-6.5 6.7-9.2 5.2-1.1 6.6-3.6 6.6-3.6s-1.5.2-2.1.2c-.8 0-1.4-.2-1.7-.3 1.3-1.2 2.4-1.5 3.5-1.7.9-.2 1.8-.4 3-1.2 2.2-1.6 1.9-5.5 1.8-5.7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Welcome to your feed!</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Connect your wallet and start posting to see updates here. Your feed will show posts from people you follow and trending content.
              </p>
            </div>
          ) : (
            reduxPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                comments={reduxComments.filter(comment => comment.postId === post.id)}
              />
            ))
          )}
        </div>
      )}
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