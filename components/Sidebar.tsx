import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { FaHome, FaHashtag, FaBell, FaEnvelope, FaBookmark, 
         FaUser, FaCog, FaEllipsisH, FaFeather, FaGem } from 'react-icons/fa';
import { useWallet } from '../lib/contexts/WalletContext';
import Image from 'next/image';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const auraPoints = useSelector((state: RootState) => state.auraPoints.totalPoints || 0);
  const { connectWallet, connected, walletAddress } = useWallet();
  const [activeHoverItem, setActiveHoverItem] = useState<string | null>(null);
  
  // Truncate wallet address for display
  const truncateWallet = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const navigation = [
    { name: 'Home', href: '/home', icon: FaHome },
    { name: 'Explore', href: '/explore', icon: FaHashtag },
    { name: 'Notifications', href: '/notifications', icon: FaBell, badge: 3 },
    { name: 'Messages', href: '/messages', icon: FaEnvelope, badge: 2 },
    { name: 'Bookmarks', href: '/bookmarks', icon: FaBookmark },
    { name: 'Profile', href: '/profile', icon: FaUser },
    { name: 'Settings', href: '/settings', icon: FaCog },
    { name: 'More', href: '#', icon: FaEllipsisH },
  ];

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <aside className={`flex flex-col h-screen sticky top-0 ${className}`}>
      {/* Logo */}
      <div className="flex-shrink-0 p-3">
        <Link href="/home">
          <div className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              GA
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="mb-4 flex-1">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div 
                className="flex items-center p-3 mb-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onMouseEnter={() => setActiveHoverItem(item.name)}
                onMouseLeave={() => setActiveHoverItem(null)}
              >
                <div className="relative">
                  <item.icon 
                    className={`h-6 w-6 ${
                      isActive 
                        ? 'text-black dark:text-white' 
                        : 'text-black dark:text-white'
                    }`} 
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{item.badge}</span>
                  )}
                </div>
                <span className={`text-lg ml-4 hidden xl:inline text-black dark:text-white ${isActive ? 'font-bold' : ''}`}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Post Button */}
      <div className="px-3 mb-4">
        <Link href="/compose">
          <button className="tweet-button flex items-center justify-center">
            <span className="md:hidden">
              <FaFeather className="h-5 w-5" />
            </span>
            <span className="hidden md:block">Post</span>
          </button>
        </Link>
      </div>

      {/* User Profile Section - Always show profile if connected */}
      {connected && (
        <div className="mt-auto mb-4 px-3">
          <div className="flex items-center p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-primary text-white flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username || 'User'} 
                    className="w-10 h-10 object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold">
                    {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="ml-3 flex-1 hidden md:block">
                <div className="font-bold text-black dark:text-white">
                  {user.username || 'Anonymous User'}
                </div>
                <div className="text-sm text-black dark:text-gray-400">
                  @{user.username || truncateWallet(walletAddress || '')}
                </div>
                <div className="text-sm flex items-center text-black dark:text-gray-400">
                  <FaGem className="mr-1 text-primary" /> <span className="font-bold text-primary">{auraPoints}</span> Aura Points
                </div>
              </div>
            </div>
            <div className="text-black dark:text-gray-400 hidden md:block">
              <FaEllipsisH />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
