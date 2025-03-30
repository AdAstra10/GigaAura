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
    const cachedPosts = localStorage.getItem('cachedPosts');
    if (cachedPosts) {
      dispatch(setFeed(JSON.parse(cachedPosts)));
    } else {
      dispatch(setFeed([]));
    }
    setIsLoading(false);
  }, [dispatch]);
  
  // Save posts to cache whenever they change
  useEffect(() => {
    if (feed.length > 0) {
      localStorage.setItem('cachedPosts', JSON.stringify(feed));
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
  
  return (
    <div className="feed-container space-y-4">
      {/* Create Post */}
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

            <div className="mt-2">
              {selectedFile && (
                <div className="relative mt-2">
                  {selectedFileType === 'image' ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Selected"
                      className="max-h-40 rounded-lg"
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(selectedFile)}
                      className="max-h-40 rounded-lg"
                      controls
                    />
                  )}
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="absolute top-1 right-1 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/90"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover-effect rounded-full"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                  <button
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover-effect rounded-full"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setLocation({
                              lat: position.coords.latitude,
                              lng: position.coords.longitude,
                            });
                            toast.success('Location added to your post');
                          },
                          () => {
                            toast.error('Unable to retrieve your location');
                          }
                        );
                      }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                  <button
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover-effect rounded-full"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={isSubmitting || (!newPostContent.trim() && !selectedFile)}
                  className={`px-4 py-1.5 rounded-full text-white font-medium hover-effect ${
                    isSubmitting || (!newPostContent.trim() && !selectedFile)
                      ? 'bg-primary/60 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
            {showEmojiPicker && (
              <div className="absolute z-10 mt-1">
                {/* @ts-ignore */}
                <EmojiPicker
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setNewPostContent(
                      (prev: string) => prev + emojiData.emoji
                    );
                    setShowEmojiPicker(false);
                  }}
                  width={300}
                  height={350}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-6 text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading posts...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 transparent-bg rounded-lg shadow-md no-shadow card-outline p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No posts yet.</p>
          <p className="mt-2 dark:text-gray-300">Be the first to share an update!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              comments={getPostComments(post.id)}
              onShare={() => handleSharePost(post.id)}
              onFollow={() => post.authorWallet && handleFollowUser(post.authorWallet, post.authorUsername || '')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed; 