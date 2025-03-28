import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@lib/store';
import { setFeed, addPost, Post, loadFromCache } from '@lib/slices/postsSlice';
import { addTransaction } from '@lib/slices/auraPointsSlice';
import PostCard from './PostCard';
import CreatePostForm from './CreatePostForm';
import { v4 as uuidv4 } from 'uuid';

const Feed = () => {
  const dispatch = useDispatch();
  const { feed, loading, error } = useSelector((state: RootState) => state.posts);
  const { walletAddress } = useSelector((state: RootState) => state.user);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Try to load feed from cache first, then fetch if needed
  useEffect(() => {
    // First attempt to load from cache
    dispatch(loadFromCache());
    
    // Check if we have data from cache
    if (feed.length > 0) {
      setIsInitialLoading(false);
      return;
    }
    
    // If no cached data, load mock data
    const timer = setTimeout(() => {
      // Mock data for initial posts
      const mockPosts: Post[] = [
        {
          id: uuidv4(),
          content: "Just minted my first NFT on Solana! The transaction fees are amazingly low compared to other chains. #SolanaRocks",
          authorWallet: "8xut..j4f2",
          authorUsername: "SolanaWhale",
          authorAvatar: "https://cloudinary.com/avatar1.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          likes: 24,
          comments: 5,
          shares: 3,
          likedBy: [],
        },
        {
          id: uuidv4(),
          content: "The future of web3 social media is all about ownership and rewards. Excited to be part of this community!",
          authorWallet: "9ytr..h5g3",
          authorUsername: "CryptoVisionary",
          authorAvatar: "https://cloudinary.com/avatar2.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          mediaUrl: "https://cloudinary.com/crypto-image.jpg",
          mediaType: "image",
          likes: 42,
          comments: 12,
          shares: 7,
          likedBy: [],
        },
        {
          id: uuidv4(),
          content: "Building on Solana has been an incredible experience. The speed and low cost make it perfect for social applications.",
          authorWallet: "3rfg..k8j2",
          authorUsername: "SolDeveloper",
          authorAvatar: "https://cloudinary.com/avatar3.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
          likes: 31,
          comments: 8,
          shares: 2,
          likedBy: [],
        },
      ];
      
      dispatch(setFeed(mockPosts));
      setIsInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [dispatch, feed.length]);

  const handleCreatePost = (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!walletAddress) return;
    
    // Create a new post
    dispatch(addPost({
      content,
      authorWallet: walletAddress,
      ...(mediaUrl && { mediaUrl }),
      ...(mediaType && { mediaType }),
    }));
    
    // Add an Aura Points transaction for creating a post
    dispatch(addTransaction({
      id: uuidv4(),
      walletAddress,
      action: 'post_created',
      points: 5, // 5 points for creating a post
      timestamp: new Date().toISOString(),
    }));
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreatePostForm onSubmit={handleCreatePost} />
      
      {error && (
        <div className="bg-error/10 text-error p-4 rounded-lg">
          {error}
        </div>
      )}
      
      {feed.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-dark mb-2">No posts yet</h2>
          <p className="text-gray-600 mb-4">
            Be the first to create a post and earn 5 Aura Points!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed; 