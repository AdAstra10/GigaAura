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
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

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

const Feed = () => {
  const dispatch = useDispatch();
  const { walletAddress } = useWallet();
  const { isDarkMode } = useDarkMode();
  const feed = useSelector((state: RootState) => state.posts.feed);
  const comments = useSelector((state: RootState) => state.posts.comments);
  const user = useSelector((state: RootState) => state.user);
  
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
        dispatch(setFeed(JSON.parse(cachedPosts)));
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
    if (feed && feed.length > 0) {
      try {
        localStorage.setItem('cachedPosts', JSON.stringify(feed));
      } catch (error) {
        console.error('Error caching posts:', error);
      }
    }
  }, [feed]);
  
  // Handle file selection for media upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };
  
  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewPostContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
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
  };
  
  const handleFollowUser = (userWallet: string, username: string) => {
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
  };

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments.filter(comment => comment.postId === postId);
  };

  // Filter feed based on active tab
  const filteredFeed = activeTab === 'following' ? 
    feed.filter(post => user.following?.includes(post.authorWallet)) : 
    feed;
    
  // Replace the getSortedFeed function with this improved version
  // that has better null handling
  const getSortedFeed = (posts: Post[]) => {
    // First ensure feed exists and has items
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return [];
    }
    
    try {
      // Make a defensive copy to avoid modifying the original
      const safePosts = [...posts].filter(post => 
        // Filter out any potentially invalid posts
        post && typeof post === 'object' && post.id
      );
      
      return safePosts.sort((a, b) => {
        // Extra safe date comparison
        const dateA = getSafeDate(a.createdAt);
        const dateB = getSafeDate(b.createdAt);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error sorting feed:', error);
      // Return the original posts as fallback
      return posts;
    }
  };
  
  // Get the sorted feed
  const sortedFeed = getSortedFeed(filteredFeed);
  
  return (
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
      ) : filteredFeed.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'following'
              ? "You're not following anyone yet, or they haven't posted anything."
              : "No posts yet. Be the first to post!"}
          </p>
        </div>
      ) : (
        <div>
          {sortedFeed && Array.isArray(sortedFeed) && sortedFeed.map((post) => (
            post && post.id ? (
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
            ) : null
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed; 