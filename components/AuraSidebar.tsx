import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { AuraTransaction } from '../lib/slices/auraPointsSlice';
import AuraPointsCounter from './AuraPointsCounter';

const AuraSidebar = () => {
  const { walletAddress } = useSelector((state: RootState) => state.user);
  const { totalPoints, transactions } = useSelector((state: RootState) => state.auraPoints);
  const [recentTransactions, setRecentTransactions] = useState<AuraTransaction[]>([]);

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold mb-4 dark:text-white">Your Aura</h2>
      
      <div className="bg-[#F6B73C]/10 dark:bg-[#F6B73C]/5 rounded-lg p-4 mb-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Aura Points</p>
        <div className="text-2xl font-bold text-[#F6B73C]">
          <AuraPointsCounter points={totalPoints} />
        </div>
      </div>
      
      <h3 className="text-md font-medium mb-3 dark:text-white">Recent Activity</h3>
      
      {recentTransactions.length > 0 ? (
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium dark:text-white">{getActionLabel(tx.action)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(tx.timestamp)}</p>
              </div>
              <div className="text-sm font-semibold text-[#F6B73C]">+{tx.amount} AP</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity. Start interacting to earn Aura Points!</p>
      )}
      
      <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-md font-medium mb-3 dark:text-white">How to Earn Aura</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li className="flex justify-between">
            <span>Create a post</span>
            <span className="font-semibold text-[#F6B73C]">+50 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Receive a like</span>
            <span className="font-semibold text-[#F6B73C]">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Comment on a post</span>
            <span className="font-semibold text-[#F6B73C]">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Receive a comment</span>
            <span className="font-semibold text-[#F6B73C]">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Gain a follower</span>
            <span className="font-semibold text-[#F6B73C]">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Follow someone</span>
            <span className="font-semibold text-[#F6B73C]">+10 AP</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AuraSidebar; 