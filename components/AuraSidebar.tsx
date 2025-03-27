import { useSelector } from 'react-redux';
import { RootState } from '@lib/store';

const AuraSidebar = () => {
  const { totalPoints, transactions } = useSelector((state: RootState) => state.auraPoints);
  
  // Format the type of transaction for display
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'post_created':
        return 'Created a post';
      case 'like_received':
        return 'Received a like';
      case 'comment_made':
        return 'Made a comment';
      case 'follower_gained':
        return 'Gained a follower';
      case 'post_shared':
        return 'Post was shared';
      default:
        return type.replace('_', ' ');
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg mb-4">
        <h2 className="text-xl font-bold text-dark mb-1">Your Aura Points</h2>
        <div className="text-3xl font-bold text-primary">{totalPoints}</div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center p-4 bg-light rounded-lg">
            <p className="text-gray-500">No activity yet</p>
            <p className="text-sm text-gray-500 mt-1">Start engaging to earn Aura Points!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-2 hover:bg-light rounded-md">
                <div>
                  <p className="text-sm font-medium">{formatTransactionType(transaction.action)}</p>
                  <p className="text-xs text-gray-500">{formatTimestamp(transaction.timestamp)}</p>
                </div>
                <div className="flex items-center text-accent font-medium">
                  +{transaction.points}
                  <span className="ml-1 text-xs">AP</span>
                </div>
              </div>
            ))}
            
            {transactions.length > 5 && (
              <button className="w-full text-center text-primary text-sm mt-2 p-2 hover:bg-light rounded-md">
                View All Activity
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Earn More Points</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span>Create a post</span>
            <span className="font-medium text-accent">+5 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Receive a like</span>
            <span className="font-medium text-accent">+1 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Make a comment</span>
            <span className="font-medium text-accent">+1 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Gain a follower</span>
            <span className="font-medium text-accent">+1 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Share a post</span>
            <span className="font-medium text-accent">+1 AP</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AuraSidebar; 