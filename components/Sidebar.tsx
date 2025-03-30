import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import {
  FaHome,
  FaSearch,
  FaBell, 
  FaEnvelope,
  FaBookmark,
  FaUser,
  FaCog,
  FaInfoCircle,
  FaUserAlt
} from 'react-icons/fa';
import { RiHome7Fill } from 'react-icons/ri';
import { IoSearchSharp } from 'react-icons/io5';
import { IoMdNotifications } from 'react-icons/io';
import { BsFillEnvelopeFill, BsBookmarkFill } from 'react-icons/bs';
import { FaGear } from 'react-icons/fa6';
import { IoInformationCircle } from 'react-icons/io5';

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
    { 
      name: 'Home', 
      href: '/', 
      icon: FaHome,
      activeIcon: RiHome7Fill 
    },
    { 
      name: 'Explore', 
      href: '/explore', 
      icon: FaSearch,
      activeIcon: IoSearchSharp
    },
    { 
      name: 'Notifications', 
      href: '/notifications', 
      icon: FaBell,
      activeIcon: IoMdNotifications
    },
    { 
      name: 'Messages', 
      href: '/messages', 
      icon: FaEnvelope,
      activeIcon: BsFillEnvelopeFill
    },
    { 
      name: 'Bookmarks', 
      href: '/bookmarks', 
      icon: FaBookmark,
      activeIcon: BsBookmarkFill
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: FaUser,
      activeIcon: FaUserAlt
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: FaCog,
      activeIcon: FaGear
    },
    { 
      name: 'About', 
      href: '/about', 
      icon: FaInfoCircle,
      activeIcon: IoInformationCircle
    },
  ];

  return (
    <aside className={`flex flex-col h-full ${className}`}>
      {/* Logo section */}
      <div className="flex justify-center py-4 px-3 mb-2 xl:justify-start">
        <Link href="/">
          <div className="text-primary font-bold text-2xl">
            GigaAura
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 mb-4">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div className="group">
                <div className={`flex items-center xl:px-4 px-3 py-3 text-xl rounded-full 
                  mx-auto xl:mx-0
                  transition-colors duration-200
                  hover:bg-gray-200 dark:hover:bg-gray-800
                  ${isActive ? 'font-bold' : 'font-normal'}`}
                >
                  <div className="min-w-[32px] flex justify-center xl:justify-start">
                    {isActive ? (
                      <item.activeIcon className="h-7 w-7 text-black dark:text-white" />
                    ) : (
                      <item.icon className="h-7 w-7 text-gray-700 dark:text-gray-200 
                        group-hover:text-black dark:group-hover:text-white" />
                    )}
                  </div>
                  <span className="hidden xl:block ml-4 text-black dark:text-white">
                    {item.name}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Post button */}
      <div className="px-3 mb-4">
        <Link href="/">
          <button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-full w-full">
            <span className="hidden xl:inline">Post</span>
            <span className="xl:hidden">+</span>
          </button>
        </Link>
      </div>

      {/* User Profile Section */}
      <div className="mt-auto pb-4 px-3">
        <Link href="/profile">
          <div className="flex items-center space-x-3 p-2 rounded-full 
            hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center flex-shrink-0">
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
            <div className="hidden xl:block overflow-hidden">
              <div className="font-bold text-black dark:text-white truncate">
                {user.username || 'Anonymous User'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{user.username || truncateWallet(walletAddress || '')}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
