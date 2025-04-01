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
          <div className="p-3 rounded-full hover:bg-[var(--gray-light)] cursor-pointer transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" className="fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
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
                className="x-navbar-item"
                onMouseEnter={() => setActiveHoverItem(item.name)}
                onMouseLeave={() => setActiveHoverItem(null)}
              >
                <div className="relative">
                  <item.icon 
                    className={`h-6 w-6 ${
                      isActive 
                        ? 'text-[var(--text-primary)]' 
                        : 'text-[var(--text-primary)]'
                    }`} 
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{item.badge}</span>
                  )}
                </div>
                <span className={`x-navbar-text ${isActive ? 'font-bold' : ''}`}>{item.name}</span>
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

      {/* User Profile Section */}
      {connected ? (
        <div className="mt-auto mb-4 px-3">
          <div className="flex items-center p-3 rounded-full hover:bg-[var(--gray-light)] cursor-pointer transition-colors justify-between">
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
                <div className="font-bold text-[var(--text-primary)]">
                  {user.username || 'Anonymous User'}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  @{user.username || truncateWallet(walletAddress || '')}
                </div>
                <div className="text-sm flex items-center text-[var(--text-secondary)]">
                  <FaGem className="mr-1 text-primary" /> <span className="font-bold text-primary">{auraPoints}</span> Aura Points
                </div>
              </div>
            </div>
            <div className="text-[var(--text-secondary)] hidden md:block">
              <FaEllipsisH />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-auto mb-4 px-3">
          <button 
            onClick={handleConnectWallet}
            className="tweet-button"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
