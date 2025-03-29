import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, addComment, setComments } from '../lib/slices/postsSlice';
import { useWallet } from '../contexts/WalletContext';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import PostCard from './PostCard';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Feed = () => {
  const dispatch = useDispatch();
  const { walletAddress } = useWallet();
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
        counterpartyWallet: post?.authorWallet
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
    <div className="w-full">
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