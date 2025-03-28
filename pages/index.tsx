import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { addPost, loadFromCache, setFeed } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import AuraSidebar from '../components/AuraSidebar';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const HomePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connect, isConnected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const { feed } = useSelector((state: RootState) => state.posts);
  
  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    // Load feed from cache when component mounts
    dispatch(loadFromCache());
    setIsLoadingFeed(false);
    
    // Set up interval to refresh feed every 30 seconds
    const intervalId = setInterval(() => {
      refreshFeed();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [dispatch]);
  
  const refreshFeed = () => {
    // In a real app, this would fetch the latest posts from the server
    // For this demo, we're just simulating by sorting the existing feed by date
    const sortedFeed = [...feed].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    dispatch(setFeed(sortedFeed));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      const confirmConnect = window.confirm('You need to connect your wallet to create a post. Connect now?');
      if (confirmConnect) {
        await connect();
        return; // Return and let the user try again after connecting
      } else {
        return;
      }
    }
    
    if (!postContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a new post
      const newPost = {
        content: postContent,
        authorWallet: walletAddress || '',
        authorUsername: user.username || undefined,
        authorAvatar: user.avatar || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
      };
      
      dispatch(addPost(newPost));
      
      // Add Aura Points for creating a post
      dispatch(addTransaction({
        id: uuidv4(),
        points: 50,
        timestamp: new Date().toISOString(),
        action: 'post_created',
        walletAddress: walletAddress || '',
        metadata: {
          postId: uuidv4(),
        }
      }));
      
      toast.success('Post created! +50 Aura Points');
      
      // Reset form
      setPostContent('');
      setMediaUrl('');
      setMediaType(null);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, you would upload the file to a server
    // For this demo, we're just simulating with a local URL
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error('Please upload an image or video file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
        setMediaType(isImage ? 'image' : 'video');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSharePost = (postId: string) => {
    // In a real app, this would open a share dialog
    toast.success('Post sharing feature coming soon!');
  };

  return (
    <>
      <Head>
        <title>GigaAura</title>
        <meta name="description" content="GigaAura - Social media with Aura points" />
      </Head>

      <div className="min-h-screen bg-light dark:bg-gray-900">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar - Left */}
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <div className="col-span-1 md:col-span-6 space-y-4">
            {/* Create Post Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <form onSubmit={handleCreatePost}>
                <div className="flex space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-medium">
                          {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2) || '?'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <textarea
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="What's happening?"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      rows={3}
                      maxLength={280}
                    ></textarea>
                    
                    {mediaUrl && (
                      <div className="mt-2 relative">
                        {mediaType === 'image' ? (
                          <img src={mediaUrl} alt="Upload preview" className="max-h-60 rounded-lg" />
                        ) : (
                          <video src={mediaUrl} className="max-h-60 rounded-lg" controls />
                        )}
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-gray-800 text-white rounded-full p-1"
                          onClick={() => {
                            setMediaUrl('');
                            setMediaType(null);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer text-primary hover:text-primary/80">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isSubmitting}
                          />
                        </label>
                        <button
                          type="button"
                          className="text-primary hover:text-primary/80"
                          disabled={isSubmitting}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {postContent.length}/280
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                          disabled={!postContent.trim() || isSubmitting}
                        >
                          {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Feed */}
            <div className="space-y-4">
              {isLoadingFeed ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading posts...</p>
                </div>
              ) : feed.length > 0 ? (
                feed.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    comments={[]}
                    onShare={() => handleSharePost(post.id)}
                  />
                ))
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to create a post!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar - Right */}
          <div className="hidden md:block md:col-span-3">
            <AuraSidebar />
          </div>
        </main>
      </div>
    </>
  );
};

export default HomePage; 