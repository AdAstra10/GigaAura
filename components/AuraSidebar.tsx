import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';

const AuraSidebar = () => {
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  return (
    <div className="px-4">
      {/* Aura Points */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
        <h2 className="text-xl font-bold mb-3">Aura Points</h2>
        <div className="text-2xl font-bold text-primary">{totalPoints}</div>
      </div>
      
      {/* Gain Aura */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
        <h3 className="text-xl font-bold mb-3">Gain Aura</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between">
            <span>Create a post</span>
            <span className="font-medium text-accent">+50 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Receive a like</span>
            <span className="font-medium text-accent">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Make a comment</span>
            <span className="font-medium text-accent">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Gain a follower</span>
            <span className="font-medium text-accent">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Follow someone</span>
            <span className="font-medium text-accent">+10 AP</span>
          </li>
          <li className="flex justify-between">
            <span>Share a post</span>
            <span className="font-medium text-accent">+100 AP</span>
          </li>
        </ul>
      </div>
      
      {/* Who to follow placeholder */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-4">
        <h3 className="text-xl font-bold mb-3">Who to follow</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          <p>Connect with more users to grow your network!</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 flex flex-wrap gap-x-2">
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Cookie Policy</a>
        <a href="#" className="hover:underline">Accessibility</a>
        <div className="w-full mt-1">© 2025 GigaAura Corp.</div>
      </div>
    </div>
  );
};

export default AuraSidebar; 