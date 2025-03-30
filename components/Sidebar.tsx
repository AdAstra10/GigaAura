import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { FaHome, FaCompass, FaBell, FaEnvelope, FaBookmark, 
         FaUser, FaCog, FaInfoCircle } from 'react-icons/fa';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const walletAddress = useSelector((state: RootState) => state.user.walletAddress);
  
  // Truncate wallet address for display
  const truncateWallet = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const navigation = [
    { name: 'Home', href: '/', icon: FaHome },
    { name: 'Explore', href: '/explore', icon: FaCompass },
    { name: 'Notifications', href: '/notifications', icon: FaBell },
    { name: 'Messages', href: '/messages', icon: FaEnvelope },
    { name: 'Bookmarks', href: '/bookmarks', icon: FaBookmark },
    { name: 'Profile', href: '/profile', icon: FaUser },
    { name: 'Settings', href: '/settings', icon: FaCog },
    { name: 'About', href: '/about', icon: FaInfoCircle },
  ];

  return (
    <aside className={`transparent-bg dark:bg-gray-800 rounded-lg ${className}`}>
      {/* User Profile Section */}
      <div className="p-4 mb-6">
        <Link href="/profile">
          <div className="flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg hover-effect cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username || 'User'} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold">
                  {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium dark:text-white">
                {user.username || 'Anonymous User'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                @{user.username || truncateWallet(walletAddress || '')}
              </div>
            </div>
          </div>
        </Link>

        <div className="flex mt-4 text-sm">
          <div className="mr-4">
            <span className="font-semibold dark:text-white">{user.followers?.length || 0}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">Followers</span>
          </div>
          <div>
            <span className="font-semibold dark:text-white">{user.following?.length || 0}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">Following</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 px-3 pb-4">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div 
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md hover-effect ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon 
                  className={`mr-3 h-5 w-5 ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`} 
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
