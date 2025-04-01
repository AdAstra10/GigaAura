import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments } from '../lib/slices/postsSlice';
import { useWallet } from '../contexts/WalletContext';
import { addTransaction } from '../lib/slices/auraPointsSlice';
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
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    // Mock function to simulate loading posts
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock posts data
        const mockPosts = [
          {
            id: 1,
            user: {
              name: 'Alex Johnson',
              username: 'alexjohnson',
              avatar: 'https://i.pravatar.cc/150?img=1',
              verified: true
            },
            content: 'Just deployed my first #Web3 dApp on @GigaAura! The experience was seamless. Looking forward to building more with this amazing platform. #Blockchain #Crypto',
            timestamp: '2023-05-15T14:30:00Z',
            likes: 142,
            comments: 23,
            reposts: 7
          },
          {
            id: 2,
            user: {
              name: 'Crypto Daily',
              username: 'cryptodaily',
              avatar: 'https://i.pravatar.cc/150?img=2',
              verified: true
            },
            content: 'Breaking: Major update coming to #GigaAura next week! Sources say it will include new wallet integration features and enhanced social capabilities. Stay tuned for the official announcement! #Web3News',
            timestamp: '2023-05-14T10:15:00Z',
            likes: 358,
            comments: 47,
            reposts: 112
          },
          {
            id: 3,
            user: {
              name: 'Web3 Developer',
              username: 'web3dev',
              avatar: 'https://i.pravatar.cc/150?img=3',
              verified: false
            },
            content: 'Tutorial: How to earn Aura Points on @GigaAura\n\n1. Create quality posts\n2. Engage with community\n3. Complete challenges\n4. Verify your profile\n\nHas anyone reached Elite status yet? Share your tips below! #AuraPoints #GigaAura',
            timestamp: '2023-05-13T16:45:00Z',
            likes: 89,
            comments: 31,
            reposts: 12
          },
          {
            id: 4,
            user: {
              name: 'GigaAura Official',
              username: 'gigaaura',
              avatar: 'https://i.pravatar.cc/150?img=4',
              verified: true
            },
            content: "We're excited to announce our new partnership with @PhantomWallet! This collaboration will bring enhanced features and a smoother experience to all GigaAura users. #Web3 #Partnership",
            timestamp: '2023-05-12T09:30:00Z',
            likes: 721,
            comments: 134,
            reposts: 203
          },
          {
            id: 5,
            user: {
              name: 'Blockchain Enthusiast',
              username: 'blockchainenth',
              avatar: 'https://i.pravatar.cc/150?img=5',
              verified: false
            },
            content: 'Just hit 5000 Aura Points and unlocked Elite Status! 🌟 The perks are amazing - especially loving the custom badge and boosts. Thank you @GigaAura for creating such a rewarding ecosystem! #AuraPoints #EliteStatus',
            timestamp: '2023-05-11T13:20:00Z',
            likes: 176,
            comments: 42,
            reposts: 15
          }
        ];
        
        setPosts(mockPosts);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts().catch(err => {
      showBoundary(err);
    });
  }, [activeTab, showBoundary]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 my-4">
        <h3 className="text-red-800 dark:text-red-400 font-medium">Error loading feed</h3>
        <p className="text-red-700 dark:text-red-300 text-sm">{error.message}</p>
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
    <div ref={feedRef} className="border-x border-[var(--border-color)] min-h-screen">
      {/* Tabs */}
      <div className="sticky top-0 bg-light dark:bg-dark z-10 border-b border-[var(--border-color)]">
        <div className="flex">
          <button
            className={`flex-1 py-4 text-center font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 relative ${
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
            className={`flex-1 py-4 text-center font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 relative ${
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
      <div className="p-4 border-b border-[var(--border-color)]">
        <div className="flex space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
          <div className="flex-grow">
            <textarea
              placeholder="What's happening?"
              className="w-full p-2 bg-transparent text-black dark:text-white border-b border-[var(--border-color)] focus:outline-none focus:border-primary resize-none"
              rows={2}
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-2 text-primary">
                <button className="hover:bg-primary/10 p-2 rounded-full">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.75 2H4.25C3.01 2 2 3.01 2 4.25v15.5C2 20.99 3.01 22 4.25 22h15.5c1.24 0 2.25-1.01 2.25-2.25V4.25C22 3.01 20.99 2 19.75 2zM4.25 3.5h15.5c.413 0 .75.337.75.75v9.676l-3.858-3.858c-.14-.14-.33-.22-.53-.22h-.003c-.2 0-.393.08-.532.224l-4.317 4.384-1.813-1.806c-.14-.14-.33-.22-.53-.22-.193-.03-.395.08-.535.227L3.5 17.642V4.25c0-.413.337-.75.75-.75zm-.744 16.28l5.418-5.534 6.282 6.254H4.25c-.402 0-.727-.322-.744-.72zm16.244.72h-2.42l-5.007-4.987 3.792-3.85 4.385 4.384v3.703c0 .413-.337.75-.75.75z"></path>
                  </svg>
                </button>
                <button className="hover:bg-primary/10 p-2 rounded-full">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 10.5V8.8h-4.4v6.4h1.7v-2h2v-1.7h-2v-1H19zm-7.3-1.7h1.7v6.4h-1.7V8.8zm-3.6 1.6c.4 0 .9.2 1.2.5l1.2-1C9.9 9.2 9 8.8 8.1 8.8c-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2c1 0 1.8-.4 2.4-1.1v-2.5H7.7v1.2h1.2v.6c-.2.1-.5.2-.8.2-.9 0-1.6-.7-1.6-1.6 0-.8.7-1.6 1.6-1.6z"></path>
                    <path d="M20.5 2.02h-17c-1.24 0-2.25 1.007-2.25 2.247v15.507c0 1.238 1.01 2.246 2.25 2.246h17c1.24 0 2.25-1.008 2.25-2.246V4.267c0-1.24-1.01-2.247-2.25-2.247zm.75 17.754c0 .41-.336.746-.75.746h-17c-.414 0-.75-.336-.75-.746V4.267c0-.412.336-.747.75-.747h17c.414 0 .75.335.75.747v15.507z"></path>
                  </svg>
                </button>
              </div>
              <button className="bg-primary hover:bg-primary-hover text-white font-bold py-1.5 px-4 rounded-full">
                Post
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
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={{
                id: post.id.toString(),
                content: post.content,
                authorUsername: post.user.username,
                authorWallet: post.user.username,
                authorAvatar: post.user.avatar,
                createdAt: post.timestamp,
                likes: post.likes,
                comments: post.comments,
                shares: post.reposts,
                likedBy: []
              }}
            />
          ))}
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