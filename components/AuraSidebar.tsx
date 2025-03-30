import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { AuraTransaction } from '../lib/slices/auraPointsSlice';
import AuraPointsCounter from './AuraPointsCounter';
import { FaSearch } from 'react-icons/fa';

const AuraSidebar = () => {
  const { walletAddress } = useSelector((state: RootState) => state.user);
  const { totalPoints, transactions } = useSelector((state: RootState) => state.auraPoints);
  const [recentTransactions, setRecentTransactions] = useState<AuraTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<string>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [whoToFollow, setWhoToFollow] = useState<any[]>([
    { id: 1, name: 'Bill Gates', username: 'BillGates', isVerified: true, avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: 2, name: 'Vitalik Buterin', username: 'VitalikButerin', isVerified: true, avatar: 'https://i.pravatar.cc/150?img=11' },
    { id: 3, name: 'Miya', username: 'Polr13', isVerified: false, avatar: 'https://i.pravatar.cc/150?img=5' }
  ]);
  
  const [trendingTopics, setTrendingTopics] = useState<any[]>([
    { id: 1, title: 'Bishop Brigante, Toronto Hip Hop Legend, Passes Away', category: 'Music', posts: 90 },
    { id: 2, title: 'Ontario Ice Storm Causes Widespread Outages', category: 'Weather', posts: 642 },
    { id: 3, title: 'Andrew McCutchen\'s Home Run Milestone', category: 'Baseball', posts: 313 },
    { id: 4, title: 'Crockett\'s Interracial Marriage Comments Stir Controversy', category: 'Politics', posts: '11K' }
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
    <div className="space-y-4">
      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input 
          type="text" 
          className="bg-gray-100 dark:bg-gray-800 border-none rounded-full py-3 pl-10 pr-4 w-full focus:ring-primary focus:border-primary"
          placeholder="Search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Aura Points Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 bg-gradient-to-r from-primary to-primary/80">
          <h2 className="text-xl font-bold text-white mb-1">Aura Points</h2>
          <p className="text-white/90 text-sm mb-3">
            Enjoy additional benefits as you earn Aura Points
          </p>
          <div className="flex justify-between items-center">
            <div className="text-3xl font-bold text-white">
              <AuraPointsCounter points={totalPoints} />
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold mb-3 dark:text-white">Your Aura Rewards</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex justify-between items-center">
              <span>💫 Aura Points Boost</span>
              <span className="font-semibold text-primary">Unlocked</span>
            </li>
            <li className="flex justify-between items-center">
              <span>🔥 Premium Badge</span>
              <span className="font-semibold">{totalPoints > 500 ? 'Unlocked' : `${totalPoints}/500`}</span>
            </li>
            <li className="flex justify-between items-center">
              <span>🌟 Verified Status</span>
              <span className="font-semibold">{totalPoints > 1000 ? 'Unlocked' : `${totalPoints}/1000`}</span>
            </li>
            <li className="flex justify-between items-center mt-2">
              <span>👑 Elite Status</span>
              <span className="font-semibold">{totalPoints > 5000 ? 'Unlocked' : `${totalPoints}/5000`}</span>
            </li>
          </ul>
          <button className="mt-4 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded-full w-full transition-colors">
            View Aura Status
          </button>
        </div>
      </div>

      {/* Explore Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold dark:text-white">Explore</h2>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full text-xs px-2 py-1 text-gray-700 dark:text-gray-300">
              Beta
            </div>
          </div>
          
          {trendingTopics.map(topic => (
            <div key={topic.id} className="py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <img src="https://i.pravatar.cc/150?img=13" alt="User" className="w-4 h-4 rounded-full mr-1" />
                  <span>Trending now · {topic.category}</span>
                </div>
                <span className="mx-1">·</span>
                <span>{topic.posts} posts</span>
              </div>
              <p className="font-bold text-black dark:text-white text-sm mt-1">{topic.title}</p>
            </div>
          ))}
          
          <button className="text-primary hover:text-primary/80 text-sm mt-2 transition-colors">
            Show more
          </button>
        </div>
      </div>

      {/* Who to Follow */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Who to follow</h2>
          
          {whoToFollow.map(user => (
            <div key={user.id} className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="font-bold text-black dark:text-white text-sm">{user.name}</p>
                    {user.isVerified && (
                      <span className="ml-1 text-primary">✓</span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">@{user.username}</p>
                </div>
              </div>
              <button className="bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-1.5 px-4 rounded-full hover:bg-black/80 dark:hover:bg-white/80 transition-colors">
                Follow
              </button>
            </div>
          ))}
          
          <button className="text-primary hover:text-primary/80 text-sm mt-2 transition-colors">
            Show more
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Recent Activity</h2>
          
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium dark:text-white">{getActionLabel(tx.action)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(tx.timestamp)}</p>
                  </div>
                  <div className="text-sm font-semibold text-primary">+{tx.amount} AP</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity. Start interacting to earn Aura Points!</p>
          )}
        </div>
      </div>

      {/* How to Earn Aura */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h3 className="font-bold mb-3 dark:text-white">How to Earn Aura</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex justify-between">
              <span>Create a post</span>
              <span className="font-semibold text-primary">+50 AP</span>
            </li>
            <li className="flex justify-between">
              <span>Receive a like</span>
              <span className="font-semibold text-primary">+10 AP</span>
            </li>
            <li className="flex justify-between">
              <span>Comment on a post</span>
              <span className="font-semibold text-primary">+10 AP</span>
            </li>
            <li className="flex justify-between">
              <span>Receive a comment</span>
              <span className="font-semibold text-primary">+10 AP</span>
            </li>
            <li className="flex justify-between">
              <span>Gain a follower</span>
              <span className="font-semibold text-primary">+10 AP</span>
            </li>
            <li className="flex justify-between">
              <span>Follow someone</span>
              <span className="font-semibold text-primary">+10 AP</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuraSidebar; 