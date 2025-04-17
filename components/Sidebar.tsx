import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { FaHome, FaHashtag, FaBell, FaEnvelope, FaBookmark,
         FaUser, FaCog, FaFeatherAlt, FaUserCircle } from 'react-icons/fa';
import { CogIcon, BellIcon, BookmarkIcon, HomeIcon, EnvelopeIcon, UserIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { CogIcon as CogIconSolid, BellIcon as BellIconSolid, BookmarkIcon as BookmarkIconSolid, HomeIcon as HomeIconSolid, EnvelopeIcon as EnvelopeIconSolid, UserIcon as UserIconSolid, HashtagIcon as HashtagIconSolid } from '@heroicons/react/24/solid';
import { useWallet } from '../lib/contexts/WalletContext';
import Image from 'next/image';

interface SidebarProps {
  className?: string;
  onOpenPostModal: () => void;
}

const navigationItems = [
  { name: 'Home', href: '/home', IconOutline: HomeIcon, IconSolid: HomeIconSolid },
  { name: 'Explore', href: '/explore', IconOutline: HashtagIcon, IconSolid: HashtagIconSolid },
  { name: 'Notifications', href: '/notifications', IconOutline: BellIcon, IconSolid: BellIconSolid, badge: 0 },
  { name: 'Messages', href: '/messages', IconOutline: EnvelopeIcon, IconSolid: EnvelopeIconSolid, badge: 0 },
  { name: 'Bookmarks', href: '/bookmarks', IconOutline: BookmarkIcon, IconSolid: BookmarkIconSolid },
  { name: 'Profile', href: '/profile', IconOutline: UserIcon, IconSolid: UserIconSolid },
  { name: 'Settings', href: '/settings', IconOutline: CogIcon, IconSolid: CogIconSolid },
];

const Sidebar: React.FC<SidebarProps> = ({ className = '', onOpenPostModal }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const { connected, walletAddress } = useWallet();

  const isActive = (href: string) => router.pathname === href || (href === '/profile' && router.pathname.startsWith('/profile'));

  const truncateWallet = (address: string | null | undefined) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <>
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-screen w-[88px] xl:w-[275px] px-2 xl:px-4 py-2 border-r border-gray-200 dark:border-gray-800 ${className}`}>
        <nav className="flex-1 space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const Icon = active ? item.IconSolid : item.IconOutline;
            return (
              <Link key={item.name} href={item.href} passHref>
                <div className="flex items-center justify-center xl:justify-start p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer group transition-colors duration-200">
                  <div className="relative">
                    <Icon className="h-7 w-7 text-black dark:text-white" />
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={`ml-5 text-xl hidden xl:inline ${active ? 'font-bold' : ''} text-black dark:text-white`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="my-4">
          <button
            onClick={onOpenPostModal}
            className="w-full xl:w-auto bg-primary text-white font-bold rounded-full p-3 xl:px-8 xl:py-3 flex items-center justify-center hover:bg-primary-hover transition-colors duration-200"
          >
            <FaFeatherAlt className="h-5 w-5 xl:hidden" />
            <span className="hidden xl:inline text-lg">Post</span>
          </button>
        </div>

        {connected && (
          <div className="mt-auto mb-2">
            <Link href={`/profile/${walletAddress}`} passHref>
              <div className="flex items-center justify-center xl:justify-between p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors duration-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-700 overflow-hidden">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.username || 'User Avatar'}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <FaUserCircle className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  <div className="ml-3 hidden xl:block flex-1 overflow-hidden whitespace-nowrap">
                    <div className="font-bold text-sm text-black dark:text-white truncate">
                      {user.username || 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      @{user.username || truncateWallet(walletAddress)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="flex justify-around items-center h-14">
          {navigationItems.slice(0, 4).map((item) => {
            const active = isActive(item.href);
            const Icon = active ? item.IconSolid : item.IconOutline;
            return (
              <Link key={`mobile-${item.name}`} href={item.href} passHref>
                <div className="flex flex-col items-center justify-center p-2 group relative">
                  <Icon className={`h-6 w-6 ${active ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`} />
                  {item.badge && item.badge > 0 ? (
                     <span className="absolute top-1 right-1 bg-primary text-white rounded-full w-2 h-2"></span>
                  ) : null}
                </div>
              </Link>
            );
          })}
          <button
            onClick={onOpenPostModal}
            className="absolute bottom-16 right-4 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-hover transition-colors duration-200"
            aria-label="Create Post"
           >
             <FaFeatherAlt className="h-6 w-6" />
           </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
