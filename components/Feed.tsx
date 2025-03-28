import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../lib/store';
import { setFeed, addPost, Post, loadFromCache, setComments, Comment } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import PostCard from '../components/PostCard';
import CreatePostForm from '../components/CreatePostForm';
import { v4 as uuidv4 } from 'uuid';

const Feed = () => {
  const dispatch = useDispatch();
  const { feed, loading, error, comments } = useSelector((state: RootState) => state.posts as {
    feed: Post[],
    loading: boolean,
    error: string | null,
    comments: Comment[]
  });
  const { walletAddress, username, avatar } = useSelector((state: RootState) => state.user as {
    walletAddress: string | null,
    username: string | null,
    avatar: string | null
  });
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
          authorAvatar: "https://i.pravatar.cc/150?img=1",
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
          authorAvatar: "https://i.pravatar.cc/150?img=2",
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          mediaUrl: "https://images.unsplash.com/photo-1639762681057-408e52192e55?q=80&w=2070",
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
          authorAvatar: "https://i.pravatar.cc/150?img=3",
          createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
          likes: 31,
          comments: 8,
          shares: 2,
          likedBy: [],
        },
      ];
      
      // Create some mock comments
      const mockComments = [
        {
          id: uuidv4(),
          postId: mockPosts[0].id,
          content: "Congrats on your first NFT! The Solana ecosystem is amazing.",
          authorWallet: "9ytr..h5g3",
          authorUsername: "CryptoVisionary",
          authorAvatar: "https://i.pravatar.cc/150?img=2",
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          likes: 3
        },
        {
          id: uuidv4(),
          postId: mockPosts[0].id,
          content: "What collection did you mint from?",
          authorWallet: "3rfg..k8j2",
          authorUsername: "SolDeveloper",
          authorAvatar: "https://i.pravatar.cc/150?img=3",
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          likes: 1
        },
        {
          id: uuidv4(),
          postId: mockPosts[1].id,
          content: "Absolutely! Ownership is the key difference in web3.",
          authorWallet: "8xut..j4f2",
          authorUsername: "SolanaWhale",
          authorAvatar: "https://i.pravatar.cc/150?img=1",
          createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString(),
          likes: 5
        }
      ];
      
      dispatch(setFeed(mockPosts));
      dispatch(setComments(mockComments));
      setIsInitialLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [dispatch, feed.length]);

  const handleCreatePost = (content: string, mediaFile?: File) => {
    if (!walletAddress) return;
    
    // In a real app, you would upload the file to a storage service
    // and get back a URL. For this demo, we'll create a local URL if provided.
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
    
    // Create a new post
    dispatch(addPost({
      content,
      authorWallet: walletAddress,
      authorUsername: username || undefined,
      authorAvatar: avatar || undefined,
      ...(mediaUrl && { mediaUrl }),
      ...(mediaType && { mediaType }),
    }));
    
    // Add an Aura Points transaction for creating a post
    dispatch(addTransaction({
      id: uuidv4(),
      walletAddress,
      action: 'post_created',
      points: 50, // 50 points for creating a post
      timestamp: new Date().toISOString(),
    }));
  };

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments.filter((comment: Comment) => comment.postId === postId);
  };

  // Handle following user
  const handleFollowUser = (userWallet: string) => {
    if (!walletAddress) return;
    
    // In a real app, this would update a database relation
    // For this demo, we'll just update the user state
    
    // Add Aura Points transaction for the user being followed
    dispatch(addTransaction({
      id: uuidv4(),
      walletAddress: userWallet, // Points go to user being followed
      action: 'follower_gained',
      points: 10, // 10 points for gaining a follower
      timestamp: new Date().toISOString(),
      metadata: {
        followerWallet: walletAddress,
      },
    }));
    
    // Add Aura Points for the follower
    dispatch(addTransaction({
      id: uuidv4(),
      walletAddress, // Points go to follower
      action: 'follow_given',
      points: 10, // 10 points for following someone
      timestamp: new Date().toISOString(),
      metadata: {
        followerWallet: userWallet,
      },
    }));
  };
  
  // Handle sharing post
  const handleSharePost = (postId: string) => {
    if (!walletAddress) return;
    
    // In a real app, this would create a share relation
    // For this demo, we'll just update the post state
    
    // Add Aura Points transaction for sharing
    dispatch(addTransaction({
      id: uuidv4(),
      walletAddress,
      action: 'post_shared',
      points: 100, // 100 points for sharing a post
      timestamp: new Date().toISOString(),
      metadata: {
        postId,
      },
    }));
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">No posts yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Be the first to create a post and earn 5 Aura Points!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post: Post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              comments={getPostComments(post.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed; 