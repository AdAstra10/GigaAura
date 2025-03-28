import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@lib/store';
import { Post, setFeed } from '@lib/slices/postsSlice';
import Head from 'next/head';
import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import PostCard from '@components/PostCard';
import { v4 as uuidv4 } from 'uuid';

// Predefined topics for explore page
const EXPLORE_TOPICS = [
  'All',
  'NFTs',
  'DeFi',
  'DAOs',
  'Gaming',
  'Metaverse',
  'Developers',
  'Web3',
  'Solana'
];

const ExplorePage = () => {
  const dispatch = useDispatch();
  const { feed } = useSelector((state: RootState) => state.posts);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);

  // Generate mock data for trending posts in each category
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      const topics: Record<string, string[]> = {
        'NFTs': ['NFT', 'mint', 'collection', 'art', 'digital'],
        'DeFi': ['yield', 'liquidity', 'swap', 'stake', 'farm'],
        'DAOs': ['governance', 'vote', 'proposal', 'community', 'treasury'],
        'Gaming': ['game', 'play', 'earn', 'quest', 'reward'],
        'Metaverse': ['virtual', 'land', 'avatar', 'world', 'space'],
        'Developers': ['code', 'build', 'smart contract', 'hack', 'developer'],
        'Web3': ['decentralized', 'blockchain', 'token', 'wallet', 'identity'],
        'Solana': ['SOL', 'Solana', 'SPL', 'fast', 'transaction']
      };
      
      // Create mock trending posts
      const mockTrendingPosts: Post[] = [
        {
          id: uuidv4(),
          content: "Just launched our new NFT collection on Solana! Check out 'CryptoApes' - 10,000 unique digital apes living on the Solana blockchain. #NFT #SolanaArt",
          authorWallet: "64xk..j8z9",
          authorUsername: "NFTCreator",
          authorAvatar: "https://cloudinary.com/avatar5.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          mediaUrl: "https://cloudinary.com/nft-preview.jpg",
          mediaType: "image",
          likes: 89,
          comments: 23,
          shares: 15,
          likedBy: [],
          isLiked: false,
        },
        {
          id: uuidv4(),
          content: "Our DAO just voted to allocate 500,000 SOL to fund new Solana-based projects. We're looking for innovative ideas that can scale the ecosystem! #DAOFunding #SolanaGrants",
          authorWallet: "87qt..p2c4",
          authorUsername: "DAOLeader",
          authorAvatar: "https://cloudinary.com/avatar6.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          likes: 132,
          comments: 47,
          shares: 38,
          likedBy: [],
          isLiked: false,
        },
        {
          id: uuidv4(),
          content: "Just released the alpha version of our P2E game on Solana! Earn tokens while exploring a virtual world. Looking for beta testers! #GameFi #PlayToEarn",
          authorWallet: "23fd..k7n4",
          authorUsername: "SolanaGamer",
          authorAvatar: "https://cloudinary.com/avatar7.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
          mediaUrl: "https://cloudinary.com/game-screenshot.jpg",
          mediaType: "image",
          likes: 207,
          comments: 96,
          shares: 54,
          likedBy: [],
          isLiked: false,
        },
        {
          id: uuidv4(),
          content: "Our DeFi protocol just hit $100M TVL! Thanks to everyone who's participating in our liquidity pools. APYs are currently at 22%! #DeFi #YieldFarming",
          authorWallet: "56rq..t9b3",
          authorUsername: "DeFiBuilder",
          authorAvatar: "https://cloudinary.com/avatar8.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
          likes: 174,
          comments: 62,
          shares: 29,
          likedBy: [],
          isLiked: false,
        },
        {
          id: uuidv4(),
          content: "Just pushed our first commit for a new Solana program that enables fractional NFT ownership. The code is open-source, feel free to contribute! #SolanaDev",
          authorWallet: "74xc..r5d2",
          authorUsername: "SolDeveloper",
          authorAvatar: "https://cloudinary.com/avatar9.jpg",
          createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
          likes: 113,
          comments: 34,
          shares: 21,
          likedBy: [],
          isLiked: false,
        },
      ];
      
      setTrendingPosts(mockTrendingPosts);
      
      // If there's no feed data yet, set the mock trending posts as feed
      if (feed.length === 0) {
        dispatch(setFeed(mockTrendingPosts));
      }
      
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [dispatch, feed.length]);
  
  // Filter posts based on selected topic
  const filteredPosts = selectedTopic === 'All' 
    ? trendingPosts 
    : trendingPosts.filter(post => {
        const keywords = EXPLORE_TOPICS
          .filter(topic => topic === selectedTopic)
          .flatMap(topic => {
            const topicMap: Record<string, string[]> = {
              'NFTs': ['NFT', 'mint', 'collection', 'art', 'digital'],
              'DeFi': ['yield', 'liquidity', 'swap', 'stake', 'farm'],
              'DAOs': ['governance', 'vote', 'proposal', 'community', 'treasury'],
              'Gaming': ['game', 'play', 'earn', 'quest', 'reward'],
              'Metaverse': ['virtual', 'land', 'avatar', 'world', 'space'],
              'Developers': ['code', 'build', 'smart contract', 'hack', 'developer'],
              'Web3': ['decentralized', 'blockchain', 'token', 'wallet', 'identity'],
              'Solana': ['SOL', 'Solana', 'SPL', 'fast', 'transaction']
            };
            return topicMap[topic] || [];
          });
          
        return keywords.some(keyword => 
          post.content.toLowerCase().includes(keyword.toLowerCase())
        );
      });

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Explore | GigaAura</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="max-w-7xl mx-auto py-4 grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
        <Sidebar />
        
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h1 className="text-2xl font-bold mb-4">Explore</h1>
            
            {/* Topics navigation */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex space-x-2 pb-2">
                {EXPLORE_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                      selectedTopic === topic
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Posts */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex space-x-4">
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
                ))
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No posts found for this topic</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExplorePage; 