import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { FaHome, FaCompass, FaBell, FaEnvelope, FaBookmark, 
         FaUser, FaCog, FaInfoCircle, FaTwitter } from 'react-icons/fa';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const [activeHoverItem, setActiveHoverItem] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Guest User');
  
  useEffect(() => {
    // Get username from localStorage if available
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

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
    <aside className={`${className}`}>
      {/* Logo */}
      <div className="flex items-center mb-4 pl-3">
        <Link href="/">
          <div className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <FaTwitter className="h-7 w-7 text-primary" />
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="mb-6">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div 
                className={`flex items-center px-4 py-3 text-xl font-medium rounded-full transition-colors mb-1 ${
                  isActive
                    ? 'font-bold text-black dark:text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'
                } ${activeHoverItem === item.name ? 'bg-gray-200 dark:bg-gray-800' : ''}`}
                onMouseEnter={() => setActiveHoverItem(item.name)}
                onMouseLeave={() => setActiveHoverItem(null)}
              >
                <div className="relative">
                  <item.icon 
                    className={`h-6 w-6 ${
                      isActive 
                        ? 'text-black dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`} 
                  />
                  {item.name === 'Notifications' && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  )}
                  {item.name === 'Messages' && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  )}
                </div>
                <span className="ml-4">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full"></div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Post Button */}
      <div className="px-3 mb-4">
        <button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-full w-full transition-colors">
          Post
        </button>
      </div>

      {/* User Profile Section */}
      <Link href="/profile">
        <div className="flex items-center p-3 mx-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-full flex-shrink-0 bg-primary text-white flex items-center justify-center">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username || 'User'} 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold">
                {username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="ml-3 flex-1">
            <div className="font-bold text-black dark:text-white">
              {user.username || username}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{user.username || username.toLowerCase().replace(/\s+/g, '_')}
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            •••
          </div>
        </div>
      </Link>
    </aside>
  );
};

export default Sidebar;
