import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AuraSidebar from '../components/AuraSidebar';
import PostCard from '../components/PostCard';
import { ErrorBoundary } from 'react-error-boundary';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';

// Simple LoadingSpinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Error fallback for the search page
function SearchFallback() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        We're sorry, but there was an error with your search.
      </p>
      <button
        onClick={() => router.reload()}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
      >
        Try again
      </button>
    </div>
  );
}

const Search: React.FC = () => {
  const router = useRouter();
  const { q } = router.query;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  
  // Update search query when URL query parameter changes
  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
    }
  }, [q]);
  
  // Mark component as mounted to prevent hydration issues
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle search with fuzzy matching
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery) {
        setResults([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Add a small delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock posts data (in a real app, this would come from an API)
        const mockPosts = [
          {
            id: "post1",
            content: "Just deployed my first #Web3 dApp on @GigaAura! The experience was seamless. Looking forward to building more.",
            authorUsername: "alexdev",
            authorWallet: "0xabc123",
            authorAvatar: "https://i.pravatar.cc/150?img=1",
            createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            likes: 42,
            comments: 7,
            shares: 3,
            likedBy: []
          },
          {
            id: "post2",
            content: "Earned 500 Aura Points today! This ecosystem is amazing. #GigaAura #Blockchain",
            authorUsername: "cryptoenthusiast",
            authorWallet: "0xdef456",
            authorAvatar: "https://i.pravatar.cc/150?img=2",
            createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            likes: 89,
            comments: 15,
            shares: 12,
            likedBy: []
          },
          {
            id: "post3",
            content: "The new Phantom wallet integration on GigaAura is game-changing! So much easier to manage my assets now.",
            authorUsername: "phantomfan",
            authorWallet: "0xghi789",
            authorAvatar: "https://i.pravatar.cc/150?img=3",
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            likes: 126,
            comments: 31,
            shares: 22,
            likedBy: []
          },
          {
            id: "post4",
            content: "Looking for recommendations on best practices for Web3 security. Anyone have resources to share? #CyberSecurity #Web3",
            authorUsername: "securitymindset",
            authorWallet: "0xjkl012",
            authorAvatar: "https://i.pravatar.cc/150?img=4",
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            likes: 56,
            comments: 42,
            shares: 8,
            likedBy: []
          },
          {
            id: "post5",
            content: "Just attended the Ethereum Foundation meetup. So many great ideas and projects on the horizon!",
            authorUsername: "ethdev",
            authorWallet: "0xmno345",
            authorAvatar: "https://i.pravatar.cc/150?img=5",
            createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            likes: 201,
            comments: 37,
            shares: 45,
            likedBy: []
          },
          {
            id: "post6",
            content: "Exploring the concept of decentralized social media with GigaAura. The potential is enormous!",
            authorUsername: "defiexplorer",
            authorWallet: "0xpqr678",
            authorAvatar: "https://i.pravatar.cc/150?img=6",
            createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
            likes: 78,
            comments: 14,
            shares: 9,
            likedBy: []
          },
          {
            id: "post7",
            content: "Testing different wallet solutions for my Web3 app. Phantom is working flawlessly with GigaAura.",
            authorUsername: "developerjane",
            authorWallet: "0xstu901",
            authorAvatar: "https://i.pravatar.cc/150?img=7",
            createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            likes: 45,
            comments: 8,
            shares: 3,
            likedBy: []
          }
        ];
        
        // Create an improved search function that handles keyword matching and partial matches
        const searchPostContent = (text: string, query: string) => {
          // Convert both to lowercase for case-insensitive matching
          const textLower = text.toLowerCase();
          const queryLower = query.toLowerCase();
          
          // Direct substring match gives highest score
          if (textLower.includes(queryLower)) {
            return 10;
          }
          
          // Split query into words
          const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
          let matchScore = 0;
          
          // Check for exact word matches
          for (const word of queryWords) {
            // Check if the word appears as a whole word
            const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
            if (wordRegex.test(textLower)) {
              matchScore += 5;
              continue;
            }
            
            // Check for word starts with the query word
            const startsWithRegex = new RegExp(`\\b${word}`, 'i');
            if (startsWithRegex.test(textLower)) {
              matchScore += 3;
              continue;
            }
            
            // Check for partial matches
            if (textLower.includes(word)) {
              matchScore += 2;
              continue;
            }
            
            // Check for character-level fuzzy matching (at least 70% of chars match)
            if (word.length >= 3) {
              const chars = word.split('');
              const matchCount = chars.filter(char => textLower.includes(char)).length;
              const matchPercentage = matchCount / chars.length;
              
              if (matchPercentage >= 0.7) {
                matchScore += 1;
              }
            }
          }
          
          return matchScore;
        };
        
        // Search in both content and author info
        const getPostScore = (post: any, query: string) => {
          const contentScore = searchPostContent(post.content, query) * 2; // Content is more important
          const authorNameScore = searchPostContent(post.authorUsername, query);
          const hashtagScore = post.content.toLowerCase().includes(`#${query.toLowerCase()}`) ? 8 : 0;
          
          return contentScore + authorNameScore + hashtagScore;
        };
        
        // Filter and sort results
        const filteredResults = mockPosts
          .map(post => ({
            ...post,
            searchScore: getPostScore(post, searchQuery)
          }))
          .filter(post => post.searchScore > 0)
          .sort((a, b) => b.searchScore - a.searchScore);
        
        setResults(filteredResults);
      } catch (error) {
        console.error("Error performing search:", error);
      } finally {
        setLoading(false);
      }
    };
    
    performSearch();
  }, [searchQuery]);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
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
    <ErrorBoundary FallbackComponent={SearchFallback}>
      <div className="app-container">
        <Head>
          <title>Search | GigaAura</title>
          <meta name="description" content="Search GigaAura for posts, people, and topics" />
        </Head>

        <Header />

        <main className="tab-container">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-9 md:divide-x md:divide-[var(--border-color)]">
            <div className="col-span-1 md:col-span-6 fixed-width-container">
              <div className="feed-container fixed-width-container">
                {/* Header with search input */}
                <div className="sticky top-0 bg-light dark:bg-dark z-10 thin-border border-b py-4 px-4">
                  <h1 className="text-xl font-bold text-black dark:text-white mb-3">Search</h1>
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-full px-4 py-2">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search GigaAura" 
                        className="bg-transparent border-none focus:ring-0 focus:outline-none w-full pl-2 text-black dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="hidden">Search</button>
                  </form>
                </div>
                
                {/* Search results */}
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <MagnifyingGlassIcon className="h-12 w-12 text-primary mb-4" />
                    {searchQuery ? (
                      <>
                        <h2 className="text-xl font-bold text-black dark:text-white mb-2">No results found</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          We couldn't find any posts matching "{searchQuery}". Try different keywords or check your spelling.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-xl font-bold text-black dark:text-white mb-2">Search for something</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Try searching for people, topics, or keywords
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="p-4 border-b border-[var(--border-color)]">
                      <p className="text-black dark:text-white">
                        <span className="font-bold">{results.length}</span> results for "{searchQuery}"
                      </p>
                    </div>
                    {results.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
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

export default Search; 