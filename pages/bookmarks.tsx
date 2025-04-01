import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import { ErrorBoundary } from 'react-error-boundary';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import PostCard from '../components/PostCard';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { Post } from '../lib/slices/postsSlice';

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
  
  // Add a safety flag to detect rendering issues
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load bookmarked post IDs from localStorage
  useEffect(() => {
    if (!connected || !walletAddress) {
      setLoading(false);
      return;
    }
    
    try {
      const bookmarksKey = `bookmarks-${walletAddress}`;
      const savedBookmarks = localStorage.getItem(bookmarksKey);
      
      if (savedBookmarks) {
        const parsedBookmarks = JSON.parse(savedBookmarks);
        setBookmarkedPostIds(parsedBookmarks);
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
    if (!connected || bookmarkedPostIds.length === 0) {
      setBookmarks([]);
      return;
    }
    
    setLoading(true);
    
    // Sample mock posts to ensure we always have something to display
    const mockPosts: Post[] = [
      {
        id: "bookmark1",
        content: "This is a bookmarked post about GigaAura's amazing features! #Web3 #Blockchain",
        authorUsername: "GigaAura",
        authorWallet: "0xGigaAura",
        authorAvatar: "https://i.pravatar.cc/150?img=10",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        likes: 241,
        comments: 57,
        shares: 32,
        likedBy: []
      },
      {
        id: "bookmark2",
        content: "Just learned how to earn 500 Aura Points in a single day! Check out the tutorial at GigaAura.com/tutorials #AuraPoints",
        authorUsername: "CryptoTeacher",
        authorWallet: "0xCryptoTeacher",
        authorAvatar: "https://i.pravatar.cc/150?img=11",
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        likes: 189,
        comments: 42,
        shares: 21,
        likedBy: []
      }
    ];
    
    // First try to find the post in the feed
    let foundPosts = allPosts.filter(post => bookmarkedPostIds.includes(post.id));
    
    // If we don't have enough posts from the real feed, add some mock posts
    // But only include mock posts that are in the bookmarkedPostIds
    if (foundPosts.length < bookmarkedPostIds.length) {
      const mockBookmarks = mockPosts.filter(post => 
        bookmarkedPostIds.includes(post.id) && 
        !foundPosts.some(foundPost => foundPost.id === post.id)
      );
      
      foundPosts = [...foundPosts, ...mockBookmarks];
    }
    
    setBookmarks(foundPosts);
    setLoading(false);
  }, [connected, bookmarkedPostIds, allPosts]);
  
  // Handle removing a bookmark
  const handleRemoveBookmark = (postId: string) => {
    if (!connected || !walletAddress) return;
    
    const updatedBookmarks = bookmarkedPostIds.filter(id => id !== postId);
    setBookmarkedPostIds(updatedBookmarks);
    
    // Save updated bookmarks back to localStorage
    const bookmarksKey = `bookmarks-${walletAddress}`;
    localStorage.setItem(bookmarksKey, JSON.stringify(updatedBookmarks));
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
      <div className="min-h-screen bg-light dark:bg-dark">
        <Head>
          <title>Bookmarks | GigaAura</title>
          <meta name="description" content="Your saved posts on GigaAura" />
        </Head>

        <Header />

        <main className="tab-container">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-[var(--border-color)]">
            <div className="hidden md:block md:col-span-3">
              <Sidebar className="sticky top-20 px-4" />
            </div>
            
            <div className="col-span-1 md:col-span-6 fixed-width-container">
              <div className="feed-container fixed-width-container">
                {/* Header */}
                <div className="sticky top-0 bg-light dark:bg-dark z-10 thin-border border-b py-4 px-4">
                  <h1 className="text-xl font-bold text-black dark:text-white">Bookmarks</h1>
                  <p className="text-sm text-gray-500 mt-1">Save posts to find them later</p>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : !connected ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <BookmarkIcon className="h-12 w-12 text-primary mb-4" />
                    <h2 className="text-xl font-bold text-black dark:text-white mb-2">Save posts for later</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Connect your wallet to bookmark posts and access them anytime.
                    </p>
                    <button 
                      onClick={() => router.push('/home')}
                      className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full"
                    >
                      Explore Posts
                    </button>
                  </div>
                ) : bookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <BookmarkIcon className="h-12 w-12 text-primary mb-4" />
                    <h2 className="text-xl font-bold text-black dark:text-white mb-2">No bookmarks yet</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      When you bookmark posts, they'll show up here.
                    </p>
                    <button 
                      onClick={() => router.push('/home')}
                      className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full"
                    >
                      Find Posts to Bookmark
                    </button>
                  </div>
                ) : (
                  <div>
                    {bookmarks.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onShare={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="hidden md:block md:col-span-3">
              <AuraSidebar />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Bookmarks; 