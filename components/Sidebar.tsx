import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import Image from 'next/image';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const user = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const isActive = (path: string) => router.pathname === path;
  
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Logo */}
      <Link href="/">
        <div className="p-3 mb-2">
          <Image 
            src="/images/GigaAuraLogo.png" 
            alt="GigaAura" 
            width={34} 
            height={34} 
            className="w-8 h-8" 
            priority
          />
        </div>
      </Link>
      
      {/* Navigation Links */}
      <nav className="flex-1 mt-2">
        <Link href="/">
          <div className={`flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isActive('/') ? 'font-bold' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/') ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </div>
        </Link>
        
        <Link href="/explore">
          <div className={`flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isActive('/explore') ? 'font-bold' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/explore') ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Explore</span>
          </div>
        </Link>
        
        <Link href="/notifications">
          <div className={`flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isActive('/notifications') ? 'font-bold' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/notifications') ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifications</span>
          </div>
        </Link>
        
        <Link href="/messages">
          <div className={`flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isActive('/messages') ? 'font-bold' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/messages') ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Messages</span>
          </div>
        </Link>
        
        <Link href="/profile">
          <div className={`flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isActive('/profile') ? 'font-bold' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/profile') ? 2.5 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </div>
        </Link>
        
        <div className="relative">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-full flex items-center p-3 my-1 text-xl rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span>More</span>
          </button>
          
          {showMoreMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-700">
              <Link href="/settings">
                <div className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings and privacy</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      {/* Post Button */}
      <Link href="/">
        <button className="w-full mt-4 mb-3 bg-primary hover:bg-primary/90 text-white rounded-full py-3 font-bold shadow-md transition-colors">
          Post
        </button>
      </Link>
      
      {/* User info */}
      <Link href="/profile">
        <div className="flex items-center p-3 mt-auto rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white mr-3">
            {user.username ? user.username.charAt(0).toUpperCase() : user.walletAddress?.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{user.username || 'Anon'}</div>
            <div className="text-sm text-gray-500 truncate">
              {user.walletAddress && `${user.walletAddress.substring(0, 4)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default Sidebar;
