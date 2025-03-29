import { useEffect, useState, FormEvent } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import { RootState } from '../lib/store';
import { addPost, loadFromCache, setFeed } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Feed from '../components/Feed';
import AuraSidebar from '../components/AuraSidebar';
import toast from 'react-hot-toast';
import PostCard from '../components/PostCard';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

const HomePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connectWallet, walletConnected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const { feed } = useSelector((state: RootState) => state.posts);
  
  const [postContent, setPostContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
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

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!walletConnected) {
      const confirmConnect = window.confirm('You need to connect your wallet to create a post. Connect now?');
      if (confirmConnect) {
        try {
          await connectWallet();
          return; // Return and let the user try again after connecting
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          toast.error("Could not connect to wallet. Please try again.");
          return;
        }
      } else {
        return;
      }
    }
    
    if (!postContent.trim() && !mediaUrl) {
      toast.error('Please add some content to your post');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create and dispatch the new post
      dispatch(addPost({
        content: postContent,
        authorWallet: walletAddress || '',
        authorUsername: user.username || undefined,
        authorAvatar: user.avatar || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined
      }));
      
      // Add Aura Points for creating a post
      dispatch(addTransaction({
        id: `tx_${Date.now()}`,
        amount: 50,
        timestamp: new Date().toISOString(),
        action: 'post_created',
        counterpartyName: user.username || 'You',
        counterpartyWallet: walletAddress || undefined
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
        <title>GigaAura | Home</title>
        <meta name="description" content="GigaAura - Connect with others in the Solana ecosystem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="hidden md:block md:col-span-3 sticky top-16 h-[calc(100vh-4rem)]">
          <Sidebar className="pt-2" />
        </div>
        
        <div className="col-span-1 md:col-span-6 content-column">
          <Feed />
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <AuraSidebar />
        </div>
      </main>
    </>
  );
};

export default HomePage; 