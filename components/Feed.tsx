import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments } from '../lib/slices/postsSlice';
import { useWallet } from '@solana/wallet-adapter-react';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import PostCard from './PostCard';
import CreatePostForm from './CreatePostForm';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Feed = () => {
  const dispatch = useDispatch();
  const { connected, publicKey } = useWallet();
  const feed = useSelector((state: RootState) => state.posts.feed);
  const comments = useSelector((state: RootState) => state.posts.comments);
  const user = useSelector((state: RootState) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const handleCreatePost = (content: string, mediaFile?: File) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet to post');
      return false;
    }
    
    if (!content.trim() && !mediaFile) {
      toast.error('Post cannot be empty');
      return false;
    }
    
    let mediaUrl: string | undefined;
    let mediaType: 'image' | 'video' | undefined;
    
    if (mediaFile) {
      if (mediaFile.type.startsWith('image/')) {
        mediaType = 'image';
        // In a real app, this would be an uploaded URL
        mediaUrl = URL.createObjectURL(mediaFile);
      } else if (mediaFile.type.startsWith('video/')) {
        mediaType = 'video';
        mediaUrl = URL.createObjectURL(mediaFile);
      }
    }
    
    dispatch(addPost({
      content,
      authorWallet: publicKey.toString(),
      authorUsername: user.username || undefined,
      authorAvatar: user.avatar || undefined,
      mediaUrl,
      mediaType,
    }));
    
    // Add Aura Points for creating a post
    dispatch(
      addTransaction({
        id: uuidv4(),
        points: 50,
        timestamp: new Date().toISOString(),
        action: 'post_created',
        walletAddress: publicKey.toString(),
      })
    );
    
    toast.success('Post created successfully! +50 Aura Points');
    return true;
  };
  
  const handleSharePost = (postId: string) => {
    if (!connected || !publicKey) {
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
        points: 100,
        timestamp: new Date().toISOString(),
        action: 'post_shared',
        walletAddress: publicKey.toString(),
        metadata: {
          postId
        }
      })
    );
    
    toast.success('Post shared successfully! +100 Aura Points');
  };
  
  const handleFollowUser = (userWallet: string, username: string) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet to follow users');
      return;
    }
    
    if (userWallet === publicKey.toString()) {
      toast.error('You cannot follow yourself');
      return;
    }
    
    // Add Aura Points for following someone
    dispatch(
      addTransaction({
        id: uuidv4(),
        points: 10,
        timestamp: new Date().toISOString(),
        action: 'follow_given',
        walletAddress: publicKey.toString(),
        metadata: {
          followerWallet: userWallet
        }
      })
    );
    
    // Add Aura Points for being followed
    dispatch(
      addTransaction({
        id: uuidv4(),
        points: 10,
        timestamp: new Date().toISOString(),
        action: 'follower_gained',
        walletAddress: userWallet,
        metadata: {
          followerWallet: publicKey.toString()
        }
      })
    );
    
    toast.success(`You are now following ${username || userWallet.substring(0, 6)}! +10 Aura Points`);
  };

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments.filter(comment => comment.postId === postId);
  };
  
  return (
    <div className="w-full">
      {connected && publicKey && (
        <div className="mb-4">
          <CreatePostForm onSubmit={handleCreatePost} />
        </div>
      )}
      
      <div className="space-y-0">
        {isLoading ? (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400">
            Loading posts...
          </div>
        ) : feed.length > 0 ? (
          [...feed]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
                comments={getPostComments(post.id)}
                onShare={handleSharePost ? () => handleSharePost(post.id) : undefined}
                onFollow={handleFollowUser ? () => handleFollowUser(post.authorWallet, post.authorUsername || '') : undefined}
              />
            ))
        ) : (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">No posts yet</p>
            <p className="text-sm mt-2">Be the first to post something!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed; 