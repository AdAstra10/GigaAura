import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments } from '../lib/slices/postsSlice';
import { useWallet } from '../contexts/WalletContext';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import PostCard from './PostCard';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useDarkMode } from '../contexts/DarkModeContext';
import dynamic from 'next/dynamic';
import { FaImage, FaSmile, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';

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
      <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">Something went wrong</h3>
        <p className="text-red-600 dark:text-red-300 mb-4">There was an error loading your feed. We're working on fixing it.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
  <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
    <p className="text-gray-500 dark:text-gray-400 mb-4">
      Unable to load feed. Please try again later.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
    >
      Refresh
    </button>
  </div>
);

// Safe wrapper for array operations
const getSafeArray = <T,>(array: T[] | undefined | null): T[] => {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array;
};

const Feed = () => {
  try {
    const dispatch = useDispatch();
    const { walletAddress } = useWallet();
    const { isDarkMode } = useDarkMode();
    const feed = useSelector((state: RootState) => state.posts.feed || []);
    const comments = useSelector((state: RootState) => state.posts.comments || []);
    const user = useSelector((state: RootState) => state.user || {});
    
    // Active tab state
    const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
    
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    
    // Hover states
    const [hoverPost, setHoverPost] = useState<string | null>(null);
    
    // Post creation states
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
    const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    
    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Load posts from cache or initialize with mock data
    useEffect(() => {
      try {
        const cachedPosts = localStorage.getItem('cachedPosts');
        if (cachedPosts) {
          try {
            const parsedPosts = JSON.parse(cachedPosts);
            if (Array.isArray(parsedPosts)) {
              dispatch(setFeed(parsedPosts));
            } else {
              console.warn('Cached posts are not an array, resetting feed');
              dispatch(setFeed([]));
            }
          } catch (e) {
            console.error('Error parsing cached posts:', e);
            dispatch(setFeed([]));
          }
        } else {
          dispatch(setFeed([]));
        }
      } catch (error) {
        console.error('Error loading cached posts:', error);
        dispatch(setFeed([]));
      } finally {
        setIsLoading(false);
      }
    }, [dispatch]);
    
    // Save posts to cache whenever they change
    useEffect(() => {
      if (feed && Array.isArray(feed) && feed.length > 0) {
        try {
          localStorage.setItem('cachedPosts', JSON.stringify(feed));
        } catch (error) {
          console.error('Error caching posts:', error);
        }
      }
    }, [feed]);
    
    // Handle file selection for media upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast.error('Please upload an image or video file');
          return;
        }
        
        setSelectedFile(file);
        setSelectedFileType(isImage ? 'image' : 'video');
        
        // Create a preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error handling file:', error);
        toast.error('Failed to process file');
      }
    };
    
    // Handle emoji selection
    const handleEmojiClick = (emojiData: EmojiClickData) => {
      try {
        setNewPostContent(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        textareaRef.current?.focus();
      } catch (error) {
        console.error('Error handling emoji selection:', error);
      }
    };
    
    // Handle post creation
    const handleCreatePost = async () => {
      if (!walletAddress) {
        toast.error('Please connect your wallet to create a post');
        return;
      }
      
      if (!newPostContent.trim() && !selectedFile) {
        toast.error('Post cannot be empty');
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // In a real app, you'd upload the file and get a URL
        // For this demo, we're creating a mock URL
        let mediaUrl;
        if (selectedFile) {
          // In a real app, this would be a server upload
          // For demo purposes, we'll just create a data URL
          mediaUrl = URL.createObjectURL(selectedFile);
        }
        
        // Create the new post object
        const newPost: Partial<Post> = {
          id: uuidv4(),
          content: newPostContent,
          authorWallet: walletAddress,
          authorUsername: user.username || undefined,
          authorAvatar: user.avatar || undefined,
          createdAt: new Date().toISOString(),
          likes: 0,
          comments: 0,
          shares: 0,
          likedBy: [],
          mediaUrl,
          mediaType: selectedFileType,
        };
        
        // Add the post to the feed
        dispatch(addPost(newPost as Post));
        
        // Add Aura Points for creating a post
        dispatch(
          addTransaction({
            id: uuidv4(),
            amount: 50, // 50 points for creating a post
            timestamp: new Date().toISOString(),
            action: 'post_created',
            counterpartyName: 'System',
            counterpartyWallet: 'system'
          })
        );
        
        // Reset form and state
        setNewPostContent('');
        setSelectedFile(null);
        setSelectedFilePreview(null);
        setSelectedFileType(undefined);
        setLocation(null);
        setShowEmojiPicker(false);
        
        toast.success('Post created successfully! +50 Aura Points');
      } catch (error) {
        console.error('Error creating post:', error);
        toast.error('Failed to create post');
      } finally {
        setIsSubmitting(false);
      }
    };
    
    const handleSharePost = (postId: string) => {
      try {
        if (!walletAddress) {
          toast.error('Please connect your wallet to share posts');
          return;
        }
        
        // Find and update the post
        const post = feed.find(p => p.id === postId);
        if (post) {
          const updatedPost = {...post, shares: post.shares + 1};
          const updatedFeed = feed.map(p => p.id === postId ? updatedPost : p);
          dispatch(setFeed(updatedFeed));
        }
        
        // Add Aura Points for sharing a post
        dispatch(
          addTransaction({
            id: uuidv4(),
            amount: 100,
            timestamp: new Date().toISOString(),
            action: 'post_shared',
            counterpartyName: post?.authorUsername || 'Unknown',
            counterpartyWallet: post?.authorWallet || ''
          })
        );
        
        toast.success('Post shared successfully! +100 Aura Points');
      } catch (error) {
        console.error('Error sharing post:', error);
        toast.error('Failed to share post');
      }
    };
    
    const handleFollowUser = (userWallet: string, username: string) => {
      try {
        if (!walletAddress) {
          toast.error('Please connect your wallet to follow users');
          return;
        }
        
        if (userWallet === walletAddress) {
          toast.error('You cannot follow yourself');
          return;
        }
        
        // Add Aura Points for following someone
        dispatch(
          addTransaction({
            id: uuidv4(),
            amount: 10,
            timestamp: new Date().toISOString(),
            action: 'follower_gained',
            counterpartyName: username || userWallet.substring(0, 6),
            counterpartyWallet: userWallet
          })
        );
        
        toast.success(`You are now following ${username || userWallet.substring(0, 6)}! +10 Aura Points`);
      } catch (error) {
        console.error('Error following user:', error);
        toast.error('Failed to follow user');
      }
    };

    // Get comments for a specific post
    const getPostComments = (postId: string) => {
      try {
        if (!comments || !Array.isArray(comments)) {
          return [];
        }
        return comments.filter(comment => comment && comment.postId === postId);
      } catch (error) {
        console.error('Error getting post comments:', error);
        return [];
      }
    };

    // Filter feed based on active tab
    const filteredFeed = (() => {
      try {
        if (activeTab === 'following') {
          const following = getSafeArray(user.following);
          if (following.length === 0) return [];
          
          return getSafeArray(feed).filter(post => 
            post && post.authorWallet && following.includes(post.authorWallet)
          );
        }
        return getSafeArray(feed);
      } catch (e) {
        console.error('Error filtering feed:', e);
        return [];
      }
    })();
      
    // Modify the getSortedFeed function to be more defensive
    const getSortedFeed = (posts: Post[]) => {
      // Defensive check - ensure we have valid posts
      if (!posts || !Array.isArray(posts)) {
        console.warn('Invalid feed data detected:', posts);
        return [];
      }
      
      try {
        // Only attempt to sort if we have posts
        if (posts.length === 0) {
          return [];
        }
        
        // Make a safe copy and filter out invalid posts
        const safePosts = [...posts].filter(post => 
          post && 
          typeof post === 'object' && 
          typeof post.id === 'string' && 
          post.id.length > 0
        );
        
        // Return early if we filtered out all posts
        if (safePosts.length === 0) {
          return [];
        }
        
        // Super safe sort that won't throw on invalid dates
        return safePosts.sort((a, b) => {
          try {
            // Extra safe date comparison
            const dateA = getSafeDate(a.createdAt);
            const dateB = getSafeDate(b.createdAt);
            return dateB - dateA;
          } catch (e) {
            console.warn('Error comparing post dates:', e);
            return 0; // Keep original order if comparison fails
          }
        });
      } catch (error) {
        console.error('Critical error sorting feed:', error);
        // Return empty array as fallback
        return [];
      }
    };
    
    // Get the sorted feed
    const sortedFeed = getSortedFeed(filteredFeed);
    
    return (
      <FeedErrorBoundary>
        <div className="feed-container border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button 
              className={`flex-1 py-4 text-center font-bold text-lg relative ${
                activeTab === 'for-you' 
                  ? 'text-black dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('for-you')}
            >
              For you
              {activeTab === 'for-you' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-primary rounded-full"></div>
              )}
            </button>
            <button 
              className={`flex-1 py-4 text-center font-bold text-lg relative ${
                activeTab === 'following' 
                  ? 'text-black dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => setActiveTab('following')}
            >
              Following
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          </div>

          {/* Create Post */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-primary">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username || 'User'}
                      className="h-10 w-10 object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center text-white">
                      {user.username
                        ? user.username.charAt(0).toUpperCase()
                        : walletAddress?.substring(0, 2)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  className={`w-full p-2 text-lg border-none focus:outline-none focus:ring-0 resize-none ${
                    isDarkMode
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                  placeholder="What's happening?"
                  rows={2}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  maxLength={280}
                />

                {selectedFilePreview && (
                  <div className="mt-2 relative rounded-2xl overflow-hidden">
                    {selectedFileType === 'image' ? (
                      <img src={selectedFilePreview} alt="Selected" className="w-full h-auto rounded-2xl" />
                    ) : (
                      <video src={selectedFilePreview} controls className="w-full rounded-2xl"></video>
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedFilePreview(null);
                        setSelectedFileType(undefined);
                      }}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-primary rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <FaImage />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,video/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-primary rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <FaSmile />
                    </button>
                    <button
                      className="p-2 text-primary rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <FaCalendarAlt />
                    </button>
                    <button
                      className="p-2 text-primary rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <FaMapMarkerAlt />
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={(!newPostContent.trim() && !selectedFile) || isSubmitting}
                    className={`px-4 py-1.5 rounded-full font-bold ${
                      !newPostContent.trim() && !selectedFile
                        ? 'bg-primary/50 text-white cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    } transition-colors`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>

                {showEmojiPicker && (
                  <div className="absolute z-10 mt-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div>
              {!sortedFeed || !Array.isArray(sortedFeed) || sortedFeed.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeTab === 'following'
                      ? "You're not following anyone yet, or they haven't posted anything."
                      : "No posts yet. Be the first to post!"}
                  </p>
                </div>
              ) : (
                sortedFeed.map((post) => {
                  // Skip rendering if post is invalid
                  if (!post || typeof post !== 'object' || !post.id) {
                    console.warn('Invalid post detected in feed:', post);
                    return null;
                  }
                  
                  try {
                    return (
                      <div 
                        key={post.id}
                        className={`border-b border-gray-200 dark:border-gray-700 ${
                          hoverPost === post.id ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                        } transition-colors`}
                        onMouseEnter={() => setHoverPost(post.id)}
                        onMouseLeave={() => setHoverPost(null)}
                      >
                        <PostCard
                          post={post}
                          comments={getPostComments(post.id)}
                          onShare={() => handleSharePost(post.id)}
                          onFollow={() => post.authorWallet && handleFollowUser(post.authorWallet, post.authorUsername || '')}
                        />
                      </div>
                    );
                  } catch (renderError) {
                    console.error('Error rendering post card:', renderError, post);
                    return (
                      <div key={post.id || 'fallback-key'} className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-red-500">There was an error displaying this post</p>
                      </div>
                    );
                  }
                })
              )}
            </div>
          )}
        </div>
      </FeedErrorBoundary>
    );
  } catch (error) {
    console.error('Critical error in Feed component:', error);
    return <FeedFallback />;
  }
};

export default Feed; 