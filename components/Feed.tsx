import { useEffect, useState, useRef } from 'react';
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

// Safely get the sort date value to prevent toString errors
const getSafeDate = (dateStr: string | undefined) => {
  if (!dateStr) return 0;
  try {
    return new Date(dateStr).getTime();
  } catch (e) {
    console.warn('Invalid date string:', dateStr);
    return 0;
  }
};

// Add this robust fallback error boundary component inside the Feed.tsx file
const FeedErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Feed caught error:", event.error);
      setHasError(true);
      event.preventDefault();
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return (
      <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--gray-light)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Something went wrong</h3>
        <p className="text-[var(--text-secondary)] mb-4">There was an error loading your feed. We're working on fixing it.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full"
        >
          Refresh Page
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Simple fallback component if the Feed fails to load
const FeedFallback = () => (
  <div className="p-6 border border-[var(--border-color)] rounded-lg text-center">
    <p className="text-[var(--text-secondary)] mb-4">
      Unable to load feed. Please try again later.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full"
    >
      Refresh
    </button>
  </div>
);

// Advanced safety wrapper around the Feed component
const FeedSafetyWrapper = (props: Record<string, any>) => {
  // Extra safety check to make sure component never renders if ethereum is causing problems
  useEffect(() => {
    // Use type assertion to safely check for ethereum property
    if ((window as any).ethereum !== null) {
      console.error('ethereum property found in Feed component - should be null');
    }
  }, []);
  
  // Try to render the inner content in a protected way
  try {
    return <FeedInner {...props} />;
  } catch (error) {
    console.error('Error rendering Feed:', error);
    return <FeedFallback />;
  }
};

// The actual inner feed component with all the implementation
const FeedInner = () => {
  try {
    const dispatch = useDispatch();
    const { walletAddress } = useWallet();
    const { isDarkMode } = useDarkMode();
    const feed = useSelector((state: RootState) => state.posts.feed || []);
    const user = useSelector((state: RootState) => state.user || {});
    
    // States
    const [isLoading, setIsLoading] = useState(true);
    const [feedError, setFeedError] = useState(false);
    const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
    const [newPostContent, setNewPostContent] = useState('');
    
    // Load posts
    useEffect(() => {
      try {
        // Simple loading effect
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 1000);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Feed loading error:', error);
        setFeedError(true);
        setIsLoading(false);
      }
    }, []);
    
    // If there's an error, show error UI
    if (feedError) {
      return <FeedFallback />;
    }
    
    const formatDate = (dateString: string) => {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return `${diffSecs}s`;
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString();
    };
    
    // Return a minimal safe implementation
    return (
      <div>
        {/* Feed header */}
        <div className="feed-header">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border-color)]">
            <button 
              className={`x-tab ${activeTab === 'for-you' ? 'x-tab-active' : ''}`}
              onClick={() => setActiveTab('for-you')}
            >
              For you
              {activeTab === 'for-you' && (
                <div className="x-tab-indicator"></div>
              )}
            </button>
            <button 
              className={`x-tab ${activeTab === 'following' ? 'x-tab-active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Following
              {activeTab === 'following' && (
                <div className="x-tab-indicator"></div>
              )}
            </button>
          </div>
        </div>
        
        {/* Post creation area */}
        <div className="border-b border-[var(--border-color)] p-4">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.username?.charAt(0)?.toUpperCase() || walletAddress?.substring(0, 2) || '?'}</span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <textarea
                className="w-full bg-transparent text-[var(--text-primary)] text-xl px-0 py-2 border-0 focus:ring-0 resize-none placeholder-[var(--text-secondary)]"
                placeholder="What's happening?"
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              ></textarea>
              
              <div className="border-t border-[var(--border-color)] pt-3 flex justify-between items-center">
                <div className="flex space-x-2 text-primary">
                  <button className="p-2 hover:bg-primary/10 rounded-full">
                    <FaImage className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-primary/10 rounded-full">
                    <FaRegListAlt className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-primary/10 rounded-full">
                    <FaRegSmile className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-primary/10 rounded-full">
                    <FaMapMarkerAlt className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  disabled={!newPostContent.trim()}
                  className={`px-4 py-1.5 rounded-full font-bold text-white ${
                    !newPostContent.trim() 
                      ? 'bg-primary/50 cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary-hover'
                  }`}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Feed content */}
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div>
            {/* Sample posts */}
            {[
              {
                id: 1,
                name: 'GigaAura Team',
                username: 'GigaAuraOfficial',
                avatar: '/images/logo.png',
                content: 'Welcome to GigaAura! Your social platform with crypto wallet integration. Earn Aura Points by engaging with the community! 🎉',
                date: '2h',
                comments: 5,
                retweets: 12,
                likes: 45
              },
              {
                id: 2,
                name: 'Crypto Enthusiast',
                username: 'crypto_fan',
                content: 'Just connected my Phantom wallet to GigaAura and got my first Aura Points! The UI is smooth and reminds me of Twitter but with crypto features. Loving it so far! 🚀',
                date: '4h',
                comments: 3,
                retweets: 7,
                likes: 23
              },
              {
                id: 3,
                name: 'Tech Guru',
                username: 'techguru',
                content: 'Testing out this new platform. The combination of social media with blockchain tech is fascinating. Curious to see how Aura Points can be used in the future!',
                date: '7h',
                comments: 8,
                retweets: 4,
                likes: 31
              }
            ].map((post) => (
              <div key={post.id} className="post-container">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden">
                      {post.avatar ? (
                        <img src={post.avatar} alt={post.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{post.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-bold text-[var(--text-primary)]">{post.name}</h3>
                      <span className="ml-2 text-[var(--text-secondary)]">@{post.username}</span>
                      <span className="mx-1 text-[var(--text-secondary)]">·</span>
                      <span className="text-[var(--text-secondary)]">{post.date}</span>
                    </div>
                    <p className="mt-1 text-[var(--text-primary)]">{post.content}</p>
                    
                    <div className="mt-3 flex justify-between max-w-md">
                      <button className="tweet-action tweet-action-comment group">
                        <FaRegComment className="h-4 w-4 mr-2 group-hover:text-primary" />
                        <span>{post.comments}</span>
                      </button>
                      <button className="tweet-action tweet-action-retweet group">
                        <FaRetweet className="h-4 w-4 mr-2 group-hover:text-green-500" />
                        <span>{post.retweets}</span>
                      </button>
                      <button className="tweet-action tweet-action-like group">
                        <FaRegHeart className="h-4 w-4 mr-2 group-hover:text-pink-600" />
                        <span>{post.likes}</span>
                      </button>
                      <button className="tweet-action tweet-action-share group">
                        <FaShare className="h-4 w-4 mr-2 group-hover:text-primary" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error in Feed component:', error);
    return <FeedFallback />;
  }
};

// Export the safety-wrapped Feed component
const Feed = (props: Record<string, any>) => {
  return (
    <FeedErrorBoundary>
      <FeedSafetyWrapper {...props} />
    </FeedErrorBoundary>
  );
};

export default Feed; 