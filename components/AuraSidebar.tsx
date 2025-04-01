import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { AuraTransaction } from '../lib/slices/auraPointsSlice';
import AuraPointsCounter from './AuraPointsCounter';
import { FaSearch, FaGem, FaCheck } from 'react-icons/fa';

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
    <div className="space-y-4 w-full px-4">
      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <input 
          type="text" 
          className="search-input focus:ring-2 focus:ring-primary"
          placeholder="Search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Aura Points Card */}
      <div className="bg-white dark:bg-black rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="p-4 bg-gradient-to-r from-primary to-primary-hover">
          <h2 className="text-xl font-bold text-white mb-1">Aura Points</h2>
          <p className="text-white/90 text-sm mb-3">
            Earn points by engaging with the community
          </p>
          <div className="flex justify-between items-center">
            <div className="text-3xl font-bold text-white flex items-center">
              <FaGem className="mr-2" />
              <AuraPointsCounter points={totalPoints} />
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold mb-3 text-[var(--text-primary)]">Your Aura Rewards</h3>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
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
          <button className="mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-2 rounded-full w-full transition-colors">
            View Aura Status
          </button>
        </div>
      </div>

      {/* Explore Section */}
      <div className="bg-white dark:bg-black rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Explore</h2>
            <div className="bg-[var(--gray-light)] rounded-full text-xs px-2 py-1 text-[var(--text-secondary)]">
              Beta
            </div>
          </div>
          
          {trendingTopics.map(topic => (
            <div key={topic.id} className="py-3 px-2 hover:bg-[var(--gray-light)] transition-colors cursor-pointer">
              <div className="flex items-center text-xs text-[var(--text-secondary)]">
                <span>Trending now · {topic.category}</span>
                <span className="mx-1">·</span>
                <span>{topic.posts} posts</span>
              </div>
              <p className="font-bold text-[var(--text-primary)] text-sm mt-1">{topic.title}</p>
            </div>
          ))}
          
          <button className="text-primary hover:bg-primary/10 px-2 py-1 rounded-full text-sm mt-2 transition-colors">
            Show more
          </button>
        </div>
      </div>

      {/* Who to Follow */}
      <div className="bg-white dark:bg-black rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Who to follow</h2>
          
          {whoToFollow.map(user => (
            <div key={user.id} className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <div className="flex items-center">
                    <p className="font-bold text-[var(--text-primary)] text-sm">{user.name}</p>
                    {user.isVerified && (
                      <span className="ml-1 bg-primary text-white rounded-full p-0.5 flex items-center justify-center" style={{ width: '14px', height: '14px' }}>
                        <FaCheck size={8} />
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm">@{user.username}</p>
                </div>
              </div>
              <button className="bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-1.5 px-4 rounded-full hover:bg-opacity-80">
                Follow
              </button>
            </div>
          ))}
          
          <button className="text-primary hover:bg-primary/10 px-2 py-1 rounded-full text-sm mt-2 transition-colors">
            Show more
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-black rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Recent Activity</h2>
          
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{getActionLabel(tx.action)}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{formatTimestamp(tx.timestamp)}</p>
                  </div>
                  <div className="text-sm font-semibold text-primary flex items-center">
                    <FaGem className="mr-1" size={12} />
                    <span>+{tx.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm">No recent activity. Start interacting to earn Aura Points!</p>
          )}
        </div>
      </div>

      {/* Footer Links */}
      <div className="text-[var(--text-secondary)] text-xs">
        <div className="flex flex-wrap gap-2">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
          <a href="#" className="hover:underline">Accessibility</a>
          <a href="#" className="hover:underline">Ads info</a>
          <a href="#" className="hover:underline">More ...</a>
        </div>
        <div className="mt-2">© 2025 GigaAura Corp.</div>
      </div>
    </div>
  );
};

export default AuraSidebar; 