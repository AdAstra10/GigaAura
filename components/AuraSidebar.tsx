import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { AuraTransaction } from '../lib/slices/auraPointsSlice';
import AuraPointsCounter from './AuraPointsCounter';
import { FaSearch, FaGem, FaCheck } from 'react-icons/fa';
import Image from 'next/image';
import { MagnifyingGlassIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

const AuraSidebar = () => {
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
    { id: 1, title: 'SSC CGL Aspirants Demand Reforms for Fairness', category: 'Education', posts: '3.2K' },
    { id: 2, title: 'Ohtani\'s Stolen Base Spotlight', category: 'Baseball', posts: '544' },
    { id: 3, title: 'Adin Ross Confronts JasonTheWeen Over Racism Accusation', category: 'Streaming', posts: '93' },
    { id: 4, title: 'ENHYPEN\'s Jake Sparks Fan Frenzy with Puppy Plea on Weverse', category: 'Music', posts: '1.9K' }
  ]);

  useEffect(() => {
    // Get the 5 most recent transactions
    const recent = [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    
    setRecentTransactions(recent);
  }, [transactions]);

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

  return (
    <div className="hidden md:flex flex-col space-y-4 py-4 pl-4 pr-8 sticky top-0 h-screen overflow-y-auto max-h-screen">
      {/* Search */}
      <div className="relative mb-4">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search" 
            className="search-input bg-transparent border-none focus:ring-0 w-full pl-2"
          />
        </div>
      </div>
      
      {/* Trending */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="trending-topic-title text-xl mb-4">Trending</h2>
        
        {/* Trending Items */}
        {[1, 2, 3].map((item) => (
          <div key={item} className="mb-4 last:mb-0">
            <div className="flex justify-between items-start">
              <span className="trending-topic-subtitle text-sm">Web3 · Trending</span>
              <span className="text-gray-400">...</span>
            </div>
            <h3 className="trending-topic-title font-bold my-1">#{item === 1 ? 'Ethereum' : item === 2 ? 'GigaAura' : 'Web3'}</h3>
            <span className="metadata text-sm">{`${Math.floor(Math.random() * 100)}K Tweets`}</span>
          </div>
        ))}
        
        <a href="#" className="text-primary block mt-4 text-sm">Show more</a>
      </div>
      
      {/* Who to follow */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="trending-topic-title text-xl mb-4">Who to follow</h2>
        
        {/* Follow items */}
        {[
          { name: 'Vitalik Buterin', handle: '@vitalikbuterin', verified: true },
          { name: 'GigaAura', handle: '@gigaaura', verified: true },
          { name: 'Web3 Daily', handle: '@web3daily', verified: false },
        ].map((person, idx) => (
          <div key={idx} className="flex items-center justify-between mb-4 last:mb-0">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                <Image src={`https://i.pravatar.cc/150?u=${person.handle}`} alt={person.name} width={40} height={40} />
              </div>
              <div className="ml-3">
                <div className="flex items-center">
                  <span className="profile-name font-bold">{person.name}</span>
                  {person.verified && <CheckBadgeIcon className="h-4 w-4 text-primary ml-1" />}
                </div>
                <span className="user-handle block">{person.handle}</span>
              </div>
            </div>
            <button className="bg-black dark:bg-white text-white dark:text-black font-bold rounded-full px-4 py-1.5 text-sm">
              Follow
            </button>
          </div>
        ))}
        
        <a href="#" className="text-primary block mt-4 text-sm">Show more</a>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <h2 className="trending-topic-title text-xl mb-4">Recent Activity</h2>
        
        {/* Activity items */}
        {[
          { type: 'post', user: 'Alex', action: 'posted a new update' },
          { type: 'like', user: 'Jordan', action: 'liked your post' },
          { type: 'follow', user: 'Taylor', action: 'started following you' },
        ].map((activity, idx) => (
          <div key={idx} className="mb-4 last:mb-0">
            <div className="flex items-start">
              <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-2">
                <Image src={`https://i.pravatar.cc/150?u=${activity.user}`} alt={activity.user} width={32} height={32} />
              </div>
              <div>
                <span className="profile-name font-bold">{activity.user}</span>
                <span className="metadata ml-1">{activity.action}</span>
                <span className="metadata block text-sm">{`${Math.floor(Math.random() * 12)}h ago`}</span>
              </div>
            </div>
          </div>
        ))}
        
        <a href="#" className="text-primary block mt-4 text-sm">See all activity</a>
      </div>
      
      {/* Footer */}
      <div className="px-4 text-sm">
        <div className="flex flex-wrap metadata mb-2">
          <a href="#" className="mr-2 mb-1">Terms of Service</a>
          <a href="#" className="mr-2 mb-1">Privacy Policy</a>
          <a href="#" className="mr-2 mb-1">Cookie Policy</a>
          <a href="#" className="mr-2 mb-1">Accessibility</a>
          <a href="#" className="mr-2 mb-1">More</a>
        </div>
        <p className="metadata">© 2023 GigaAura</p>
      </div>
    </div>
  );
};

export default AuraSidebar; 