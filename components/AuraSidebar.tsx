import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { AuraTransaction } from '../lib/slices/auraPointsSlice';
import AuraPointsCounter from './AuraPointsCounter';
import { FaSearch, FaGem, FaCheck } from 'react-icons/fa';
import Image from 'next/image';
import { MagnifyingGlassIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { useWallet } from '../contexts/WalletContext';
import { followUser, unfollowUser } from '../lib/slices/userSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const AuraSidebar = () => {
  const router = useRouter();
  const { walletAddress } = useSelector((state: RootState) => state.user);
  const { totalPoints, transactions } = useSelector((state: RootState) => state.auraPoints);
  const [recentTransactions, setRecentTransactions] = useState<AuraTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<string>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [whoToFollow, setWhoToFollow] = useState<any[]>([
    { id: 1, name: 'Bill Gates', username: 'BillGates', isVerified: true, avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: 2, name: 'Vitalik Buterin', username: 'VitalikButerin', isVerified: true, avatar: 'https://i.pravatar.cc/150?img=11' },
    { id: 3, name: 'Jill Wine-Banks', username: 'JillWineBanks', isVerified: true, avatar: 'https://i.pravatar.cc/150?img=5' }
  ]);
  
  const [trendingTopics, setTrendingTopics] = useState<any[]>([
    { id: 1, title: 'Solana Accelerate', category: 'Crypto', posts: '3.2K' },
    { id: 2, title: 'Jupiter Acquires Drip Labs', category: 'Crypto', posts: '1.5K' },
    { id: 3, title: 'FDUSD Depegs', category: 'Cryptocurrency', posts: '2.3K' },
    { id: 4, title: 'Runway Gen-4', category: 'Technology', posts: '50' }
  ]);

  useEffect(() => {
    // Get the 5 most recent transactions
    const recent = [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    setRecentTransactions(recent);
  }, [transactions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with the query
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'post_created':
        return 'Created a post';
      case 'like_received':
        return 'Received a like';
      case 'comment_made':
        return 'Made a comment';
      case 'comment_received':
        return 'Received a comment';
      case 'follower_gained':
        return 'Gained a follower';
      case 'post_shared':
        return 'Post was shared';
      case 'follow_given':
        return 'Followed someone';
      default:
        return 'Aura transaction';
    }
  };

  const FollowButton = ({ username, wallet }: { username: string, wallet: string }) => {
    const dispatch = useDispatch();
    const { walletAddress } = useWallet();
    const following = useSelector((state: RootState) => state.user.following);
    const isFollowing = following?.includes(wallet);

    const handleFollow = () => {
      if (!walletAddress) {
        toast.error('Please connect your wallet to follow users');
        return;
      }

      if (isFollowing) {
        dispatch(unfollowUser(wallet));
        toast.success(`You unfollowed ${username}`);
      } else {
        dispatch(followUser(wallet));
        
        // Add transaction for Aura Points
        dispatch(addTransaction({
          id: uuidv4(),
          amount: 5,
          timestamp: new Date().toISOString(),
          action: 'follower_gained',
          counterpartyName: username,
          counterpartyWallet: wallet
        }));
        
        toast.success(`You followed ${username}`);
      }
    };

    return (
      <button
        onClick={handleFollow}
        className={isFollowing ? 'following-button' : 'follow-button'}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  };

  return (
    <div className="hidden md:flex flex-col space-y-4 py-4 sticky top-0 h-screen max-h-screen right-sidebar">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <div className="twitter-searchbar">
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
      
      {/* Explore section */}
      <div className="twitter-card p-4">
        <h2 className="text-xl font-bold text-black dark:text-white mb-4">Explore</h2>
        
        <div className="relative">
          <span className="absolute top-0 right-0 bg-gray-800 text-xs text-white px-2 py-0.5 rounded">Beta</span>
        </div>
        
        {/* Trending Items */}
        {trendingTopics.map((topic) => (
          <div key={topic.id} className="mb-4 hover:bg-gray-100 dark:hover:bg-[var(--twitter-hover)] p-2 rounded-lg transition-colors">
            <div className="flex items-start mb-0.5">
              <span className="text-xs text-gray-500">{topic.category} · {Math.random() > 0.5 ? 'Trending' : '2 hours ago'}</span>
            </div>
            <h3 className="font-bold text-black dark:text-white my-0.5">{topic.title}</h3>
            <span className="text-xs text-gray-500">{topic.posts} posts</span>
          </div>
        ))}
        
        <a href="#" className="text-primary block mt-2 text-sm hover:underline">Show more</a>
      </div>
      
      {/* Who to follow */}
      <div className="twitter-card p-4">
        <h2 className="text-xl font-bold text-black dark:text-white mb-4">Who to follow</h2>
        
        {/* Follow items */}
        {[
          { name: 'cloakzy', handle: '@cloakzy', verified: true },
          { name: 'Marc Andreessen', handle: '@pmarca', verified: true },
          { name: 'Ninja', handle: '@Ninja', verified: true },
        ].map((person, idx) => (
          <div key={idx} className="flex items-center justify-between mb-4 hover:bg-gray-100 dark:hover:bg-[var(--twitter-hover)] p-2 rounded-lg transition-colors">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                <Image src={`https://i.pravatar.cc/150?u=${person.handle}`} alt={person.name} width={40} height={40} />
              </div>
              <div className="ml-3">
                <div className="flex items-center">
                  <span className="font-bold text-black dark:text-white">{person.name}</span>
                  {person.verified && <CheckBadgeIcon className="h-4 w-4 text-primary ml-1" />}
                </div>
                <span className="block text-gray-500">{person.handle}</span>
              </div>
            </div>
            <FollowButton username={person.name} wallet={person.handle} />
          </div>
        ))}
        
        <a href="#" className="text-primary block mt-2 text-sm hover:underline">Show more</a>
      </div>
      
      {/* Terms section */}
      <div className="text-xs text-gray-500 mt-4">
        <div className="flex flex-wrap">
          <span className="mr-2 mb-2 hover:underline cursor-pointer">Terms of Service</span>
          <span className="mr-2 mb-2 hover:underline cursor-pointer">Privacy Policy</span>
          <span className="mr-2 mb-2 hover:underline cursor-pointer">Cookie Policy</span>
          <span className="mr-2 mb-2 hover:underline cursor-pointer">Accessibility</span>
          <span className="mr-2 mb-2 hover:underline cursor-pointer">Ads info</span>
          <span className="mr-2 mb-2 hover:underline cursor-pointer">More</span>
          <span className="mb-2">© 2025 GigaAura Corp.</span>
        </div>
      </div>
    </div>
  );
};

export default AuraSidebar; 