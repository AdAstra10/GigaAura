import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { 
  FaHome, 
  FaCompass, 
  FaBell, 
  FaEnvelope, 
  FaBookmark, 
  FaUser, 
  FaCog, 
  FaInfoCircle 
} from 'react-icons/fa';
import { 
  AiFillHome, 
  AiOutlineHome,
  AiFillCompass,
  AiOutlineCompass,
  AiFillBell,
  AiOutlineBell,
  AiFillMail,
  AiOutlineMail,
  AiFillSetting,
  AiOutlineSetting,
  AiFillInfoCircle,
  AiOutlineInfoCircle,
  AiOutlineUser,
  AiFillProfile
} from 'react-icons/ai';
import { BsPerson, BsPersonFill } from 'react-icons/bs';
import { BiSolidHome, BiHome, BiSolidBell, BiBell } from 'react-icons/bi';
import { IoSettingsOutline, IoSettingsSharp } from 'react-icons/io5';
import { IoMdInformationCircle, IoMdInformationCircleOutline } from 'react-icons/io';
import { HiOutlineHashtag, HiHashtag } from 'react-icons/hi';
import { RiBookmarkFill, RiBookmarkLine } from 'react-icons/ri';
import { FiMail, FiUser } from 'react-icons/fi';

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
    return `@${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const navigation = [
    { 
      name: 'Home', 
      href: '/', 
      activeIcon: BiSolidHome, 
      inactiveIcon: BiHome 
    },
    { 
      name: 'Explore', 
      href: '/explore', 
      activeIcon: HiHashtag, 
      inactiveIcon: HiOutlineHashtag 
    },
    { 
      name: 'Notifications', 
      href: '/notifications', 
      activeIcon: BiSolidBell, 
      inactiveIcon: BiBell 
    },
    { 
      name: 'Messages', 
      href: '/messages', 
      activeIcon: AiFillMail, 
      inactiveIcon: FiMail 
    },
    { 
      name: 'Bookmarks', 
      href: '/bookmarks', 
      activeIcon: RiBookmarkFill, 
      inactiveIcon: RiBookmarkLine 
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      activeIcon: BsPersonFill, 
      inactiveIcon: BsPerson 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      activeIcon: IoSettingsSharp, 
      inactiveIcon: IoSettingsOutline 
    },
    { 
      name: 'About', 
      href: '/about', 
      activeIcon: IoMdInformationCircle, 
      inactiveIcon: IoMdInformationCircleOutline 
    },
  ];

  return (
    <aside className={`h-full ${className}`}>
      {/* Logo */}
      <div className="flex items-center justify-center md:justify-start py-2 px-3 mb-6">
        <h1 className="text-xl font-bold text-primary">
          GigaAura
        </h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col space-y-1 mb-8">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          const IconComponent = isActive ? item.activeIcon : item.inactiveIcon;
          
          return (
            <Link key={item.name} href={item.href}>
              <div className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <IconComponent className={`icon`} />
                <span className={`text`}>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto px-3">
        <Link href="/profile">
          <div className="flex items-center p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden">
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
            <div className="ml-3">
              <div className="font-bold text-black dark:text-white text-sm">
                {user.username || 'Anonymous User'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {truncateWallet(walletAddress || '')}
              </div>
            </div>
          </div>
        </Link>

        <div className="flex mt-2 text-sm px-3 pb-4">
          <div className="mr-4">
            <span className="font-semibold text-black dark:text-white">{user.followers?.length || 0}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">Followers</span>
          </div>
          <div>
            <span className="font-semibold text-black dark:text-white">{user.following?.length || 0}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400">Following</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
