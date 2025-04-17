import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import { ErrorBoundary } from 'react-error-boundary';
import Head from 'next/head';
import AuraSidebar from '../components/AuraSidebar';
import PostCard from '../components/PostCard';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { Post } from '../lib/slices/postsSlice';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

// Simple LoadingSpinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Error fallback for the entire Bookmarks page
function BookmarksFallback() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        We're sorry, but there was an error loading your bookmarks.
      </p>
      <button
        onClick={() => router.reload()}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
      >
        Reload page
      </button>
    </div>
  );
}

const Bookmarks: React.FC = () => {
  const router = useRouter();
  const { connected, walletAddress } = useWallet();
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<string[]>([]);
  
  // Get all posts from the feed state to filter bookmarks from
  const allPosts = useSelector((state: RootState) => state.posts.feed);
  const currentUser = useSelector((state: RootState) => state.user);
  
  // Add a safety flag to detect rendering issues
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load bookmarked post IDs from localStorage
  useEffect(() => {
    if (!connected || !walletAddress) {
      setLoading(false);
      setBookmarks([]);
      setBookmarkedPostIds([]);
      return;
    }
    
    setLoading(true);
    try {
      const bookmarksKey = `bookmarks-${walletAddress}`;
      const savedBookmarks = localStorage.getItem(bookmarksKey);
      
      if (savedBookmarks) {
        const parsedBookmarks = JSON.parse(savedBookmarks);
        if (Array.isArray(parsedBookmarks)) {
          setBookmarkedPostIds(parsedBookmarks);
        } else {
          setBookmarkedPostIds([]);
        }
      } else {
        setBookmarkedPostIds([]);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      setBookmarkedPostIds([]);
    } finally {
      setLoading(false);
    }
  }, [connected, walletAddress]);

  // Filter posts to only include bookmarked ones
  useEffect(() => {
    if (bookmarkedPostIds.length === 0) {
      setBookmarks([]);
      return;
    }
    
    // Filter from the main Redux feed
    const foundPosts = allPosts.filter(post => bookmarkedPostIds.includes(post.id));
    setBookmarks(foundPosts);

  }, [bookmarkedPostIds, allPosts]);
  
  // Handle removing a bookmark (this logic should ideally be in PostCard or a shared hook/slice)
  const handleRemoveBookmark = (postId: string) => {
    if (!connected || !walletAddress) return;
    
    const updatedBookmarkIds = bookmarkedPostIds.filter(id => id !== postId);
    setBookmarkedPostIds(updatedBookmarkIds);
    
    // Save updated bookmarks back to localStorage
    const bookmarksKey = `bookmarks-${walletAddress}`;
    localStorage.setItem(bookmarksKey, JSON.stringify(updatedBookmarkIds));
    
    // Update UI immediately (already handled by the useEffect above reacting to bookmarkedPostIds)
    toast.success('Post removed from bookmarks');
  };
  
  // If not mounted yet, show minimal UI to avoid hydration issues
  if (!hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <ErrorBoundary FallbackComponent={BookmarksFallback}>
      <Layout rightSidebarContent={<AuraSidebar />}> 
        <Head>
          <title>Bookmarks | GigaAura</title>
          <meta name="description" content="Your saved posts on GigaAura" />
        </Head>

        <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <h1 className="text-xl font-bold text-black dark:text-white">Bookmarks</h1>
          {connected && (
             <p className="text-sm text-gray-500 dark:text-gray-400">@{currentUser.username || walletAddress?.substring(0, 6)}</p>
           )}
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {loading ? (
            <div className="p-6 text-center">
              <LoadingSpinner />
            </div>
          ) : !connected ? (
            <div className="p-8 text-center">
              <BookmarkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-black dark:text-white mb-2">Save posts for later</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your wallet to bookmark posts you want to easily find again.
              </p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-8 text-center">
              <BookmarkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-black dark:text-white mb-2">No bookmarks yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tap the bookmark icon on any post to save it here.
              </p>
              <button 
                onClick={() => router.push('/home')}
                className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full transition-colors"
              >
                Explore Posts
              </button>
            </div>
          ) : (
            bookmarks.map(post => (
              <PostCard
                key={post.id}
                post={post}
                comments={post.comments || []}
              />
            ))
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
};

export default Bookmarks; 