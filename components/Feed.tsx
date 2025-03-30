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

// Import the emoji picker dynamically to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

interface EmojiClickData {
  emoji: string;
}

const Feed = () => {
  const dispatch = useDispatch();
  const { walletAddress } = useWallet();
  const { isDarkMode } = useDarkMode();
  const feed = useSelector((state: RootState) => state.posts.feed);
  const comments = useSelector((state: RootState) => state.posts.comments);
  const user = useSelector((state: RootState) => state.user);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Post creation states
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load posts from cache or initialize with mock data
  useEffect(() => {
    console.log('Initializing feed...');
    const loadFeed = async () => {
      try {
        setIsLoading(true);
        const cachedPosts = localStorage.getItem('cachedPosts');
        
        if (cachedPosts) {
          const posts = JSON.parse(cachedPosts);
          console.log(`Loaded ${posts.length} posts from cache`);
          dispatch(setFeed(posts));
        } else {
          console.log('No cached posts found, creating sample posts');
          // Create sample posts if no cached posts
          const samplePosts = [
            {
              id: uuidv4(),
              content: "Welcome to GigaAura! This is a decentralized social media platform powered by Solana.",
              authorWallet: "Giga1111111111111111111111111111111111111111",
              authorUsername: "GigaAura",
              createdAt: new Date().toISOString(),
              likes: 5,
              comments: 2,
              shares: 1,
              likedBy: [],
            },
            {
              id: uuidv4(),
              content: "Connect your Phantom wallet to start posting and earning Aura Points!",
              authorWallet: "Giga1111111111111111111111111111111111111111",
              authorUsername: "GigaAura",
              createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              likes: 3,
              comments: 1,
              shares: 0,
              likedBy: [],
            }
          ];
          dispatch(setFeed(samplePosts));
          localStorage.setItem('cachedPosts', JSON.stringify(samplePosts));
        }
      } catch (error) {
        console.error('Error loading feed:', error);
        // Set empty feed on error
        dispatch(setFeed([]));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFeed();
  }, [dispatch]);
  
  // Save posts to cache whenever they change
  useEffect(() => {
    if (feed.length > 0) {
      try {
        localStorage.setItem('cachedPosts', JSON.stringify(feed));
        console.log(`Saved ${feed.length} posts to cache`);
      } catch (error) {
        console.error('Error saving posts to cache:', error);
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
  
  // Handle liking a post
  const handleLikePost = (postId: string) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to like posts');
      return;
    }
    
    // Find the post
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    
    // Check if already liked
    const alreadyLiked = post.likedBy?.includes(walletAddress);
    
    // Update post likes
    const updatedPost = {
      ...post,
      likes: alreadyLiked ? post.likes - 1 : post.likes + 1,
      likedBy: alreadyLiked 
        ? post.likedBy?.filter(addr => addr !== walletAddress) 
        : [...(post.likedBy || []), walletAddress]
    };
    
    // Update feed
    const updatedFeed = feed.map(p => p.id === postId ? updatedPost : p);
    dispatch(setFeed(updatedFeed));
    
    // Add Aura Points for liking (only if not already liked)
    if (!alreadyLiked) {
      dispatch(
        addTransaction({
          id: uuidv4(),
          amount: 5,
          timestamp: new Date().toISOString(),
          action: 'post_liked',
          counterpartyName: post.authorUsername || 'Unknown',
          counterpartyWallet: post.authorWallet
        })
      );
      
      toast.success('Post liked! +5 Aura Points');
    }
  };
  
  // Handle adding a comment
  const handleAddComment = (postId: string, commentText: string) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to comment');
      return;
    }
    
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    // Create comment
    const newComment = {
      id: uuidv4(),
      postId,
      content: commentText,
      authorWallet: walletAddress,
      authorUsername: user.username || undefined,
      authorAvatar: user.avatar || undefined,
      createdAt: new Date().toISOString(),
      likes: 0
    };
    
    // Add comment
    dispatch(addComment(newComment));
    
    // Update post comment count
    const post = feed.find(p => p.id === postId);
    if (post) {
      const updatedPost = {...post, comments: post.comments + 1};
      const updatedFeed = feed.map(p => p.id === postId ? updatedPost : p);
      dispatch(setFeed(updatedFeed));
    }
    
    // Add Aura Points for commenting
    dispatch(
      addTransaction({
        id: uuidv4(),
        amount: 10,
        timestamp: new Date().toISOString(),
        action: 'post_commented',
        counterpartyName: post?.authorUsername || 'Unknown',
        counterpartyWallet: post?.authorWallet || ''
      })
    );
    
    toast.success('Comment added! +10 Aura Points');
  };

  return (
    <div className="feed-container space-y-4">
      {/* Create Post Form */}
      <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-4">
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
              className={`w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                isDarkMode
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-50 text-gray-900 border-gray-300'
              }`}
              placeholder="What's happening in your aura today?"
              rows={2}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              maxLength={280}
            />
            
            {/* Post Creation Controls */}
            <div className="mt-2 flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="text-primary hover:text-primary-dark"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  className="text-primary hover:text-primary-dark"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className={`bg-primary hover:bg-primary-dark text-white px-4 py-1 rounded-full ${
                  (!newPostContent.trim() && !selectedFile) || isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={handleCreatePost}
                disabled={(!newPostContent.trim() && !selectedFile) || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
            
            {/* Show emoji picker */}
            {showEmojiPicker && (
              <div className="mt-2">
                <EmojiPicker
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setNewPostContent(prev => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width="100%"
                />
              </div>
            )}
            
            {/* Show selected media preview */}
            {selectedFile && (
              <div className="mt-2 relative">
                {selectedFileType === 'image' && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Selected"
                    className="w-full h-auto rounded-md"
                  />
                )}
                {selectedFileType === 'video' && (
                  <video
                    src={URL.createObjectURL(selectedFile)}
                    controls
                    className="w-full h-auto rounded-md"
                  />
                )}
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white rounded-full p-1"
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedFileType(undefined);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Posts */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading posts...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        feed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLikePost}
            onComment={handleAddComment}
            onShare={handleSharePost}
            onFollow={handleFollowUser}
            comments={getPostComments(post.id)}
            currentUserWallet={walletAddress}
          />
        ))
      )}
    </div>
  );
};

export default Feed; 