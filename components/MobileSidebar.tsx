import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { useWallet } from '../contexts/WalletContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { XMarkIcon, SunIcon, MoonIcon, CogIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { FaUserCircle } from 'react-icons/fa';

// Re-define navigation items here or import from a shared config if refactored later
// Using the same structure as Sidebar.tsx for consistency
import { HomeIcon, HashtagIcon, BellIcon, EnvelopeIcon, BookmarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, HashtagIcon as HashtagIconSolid, BellIcon as BellIconSolid, EnvelopeIcon as EnvelopeIconSolid, BookmarkIcon as BookmarkIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid';

const navigationItems = [
  { name: 'Profile', href: '/profile', IconOutline: UserIcon, IconSolid: UserIconSolid },
  // Add other items similar to the screenshot if desired (Premium, Communities etc.)
  // For now, using the main app navigation items:
  { name: 'Home', href: '/home', IconOutline: HomeIcon, IconSolid: HomeIconSolid },
  { name: 'Explore', href: '/explore', IconOutline: HashtagIcon, IconSolid: HashtagIconSolid },
  { name: 'Notifications', href: '/notifications', IconOutline: BellIcon, IconSolid: BellIconSolid },
  { name: 'Messages', href: '/messages', IconOutline: EnvelopeIcon, IconSolid: EnvelopeIconSolid },
  { name: 'Bookmarks', href: '/bookmarks', IconOutline: BookmarkIcon, IconSolid: BookmarkIconSolid },
  // Consider adding Lists, Spaces, Monetization if implemented
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const { walletAddress } = useWallet();
  const { username, avatar, followers, following } = useSelector((state: RootState) => state.user);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const truncateWallet = (address: string | null | undefined) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-4/5 max-w-xs bg-white dark:bg-black text-black dark:text-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <Link href={`/profile/${walletAddress}`} passHref>
                <div className="w-10 h-10 rounded-full overflow-hidden cursor-pointer">
                  {avatar ? (
                    <Image src={avatar} alt="User Avatar" width={40} height={40} className="object-cover" />
                  ) : (
                    <FaUserCircle className="w-10 h-10 text-gray-500" />
                  )}
                </div>
              </Link>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div>
              <Link href={`/profile/${walletAddress}`} passHref>
                 <div className="font-bold cursor-pointer hover:underline">{username || 'Unnamed User'}</div>
              </Link>
              <div className="text-sm text-gray-500 dark:text-gray-400">@{username || truncateWallet(walletAddress)}</div>
            </div>
            {/* Follower/Following Count */}
            <div className="flex space-x-4 mt-2 text-sm">
              <div>
                <span className="font-bold">{following?.length || 0}</span> <span className="text-gray-500 dark:text-gray-400">Following</span>
              </div>
              <div>
                <span className="font-bold">{followers?.length || 0}</span> <span className="text-gray-500 dark:text-gray-400">Followers</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link key={item.name} href={item.href} passHref>
                <div
                  className="flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer group transition-colors duration-200"
                  onClick={onClose} // Close sidebar on navigation
                >
                  <item.IconOutline className="h-6 w-6 mr-4" />
                  <span className="text-lg font-medium">{item.name}</span>
                </div>
              </Link>
            ))}
            {/* Add other sections like Communities, Lists, Spaces here if needed */}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
             {/* Example: Settings and Help */}
             <Link href="/settings" passHref>
               <div className="flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer group transition-colors duration-200" onClick={onClose}>
                 <CogIcon className="h-6 w-6 mr-4" />
                 <span className="text-base">Settings and privacy</span>
               </div>
             </Link>
             {/* <Link href="/help" passHref>
               <div className="flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer group transition-colors duration-200" onClick={onClose}>
                 <QuestionMarkCircleIcon className="h-6 w-6 mr-4" />
                 <span className="text-base">Help Center</span>
               </div>
             </Link> */}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                toggleDarkMode();
                // Optional: onClose(); // Keep sidebar open when toggling theme?
              }}
              className="w-full flex items-center p-3 mt-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer group transition-colors duration-200"
            >
              {isDarkMode ? (
                <>
                  <SunIcon className="h-6 w-6 mr-4" />
                  <span className="text-base">Light mode</span>
                </>
              ) : (
                <>
                  <MoonIcon className="h-6 w-6 mr-4" />
                  <span className="text-base">Dark mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar; 