import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { IoHomeOutline, IoHomeSharp, IoPersonOutline, IoPersonSharp } from 'react-icons/io5';
import { FaRegCompass, FaCompass, FaBell, FaRegBell, FaCog, FaRegUser } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import AuraPointsCounter from './AuraPointsCounter';

const Sidebar = () => {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const { totalPoints } = useSelector((state: RootState) => state.auraPoints);
  
  const isActivePath = (path: string) => {
    return router.pathname === path;
  };
  
  const truncateAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const menuItems = [
    {
      name: 'Home',
      path: '/',
      icon: isActivePath('/') ? <IoHomeSharp size={24} /> : <IoHomeOutline size={24} />,
    },
    {
      name: 'Explore',
      path: '/explore',
      icon: isActivePath('/explore') ? <FaCompass size={24} /> : <FaRegCompass size={24} />,
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: isActivePath('/notifications') ? <FaBell size={24} /> : <FaRegBell size={24} />,
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: isActivePath('/profile') ? <IoPersonSharp size={24} /> : <IoPersonOutline size={24} />,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <FaCog size={24} />,
    },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex-1">
        {/* User Profile Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-medium">
                    {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link href="/profile">
                <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary truncate cursor-pointer">
                  {user.username || 'Anonymous'}
                </div>
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {truncateAddress(walletAddress)}
              </p>
            </div>
          </div>
          
          <div className="flex justify-between mt-3 text-sm">
            <div>
              <div className="font-semibold dark:text-white">{user.following?.length || 0}</div>
              <div className="text-gray-500 dark:text-gray-400">Following</div>
            </div>
            <div>
              <div className="font-semibold dark:text-white">{user.followers?.length || 0}</div>
              <div className="text-gray-500 dark:text-gray-400">Followers</div>
            </div>
            <div>
              <div className="font-semibold dark:text-white">
                <AuraPointsCounter points={totalPoints} className="text-primary" />
              </div>
              <div className="text-gray-500 dark:text-gray-400">Aura Points</div>
            </div>
          </div>
        </div>
        
        {/* Main Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link href={item.path} key={item.name}>
                <div
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                    isActivePath(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="mr-3">{item.icon}</div>
                  <span>{item.name}</span>
                </div>
              </Link>
            ))}
          </nav>
          
          <div className="mt-6">
            <button 
              className="w-full px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              onClick={() => router.push('/')}
            >
              Create Post
            </button>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-4">
        © 2025 GigaAura. All rights reserved.
      </div>
    </div>
  );
};

export default Sidebar;
