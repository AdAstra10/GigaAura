import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@lib/store';

const Sidebar = () => {
  const user = useSelector((state: RootState) => state.user);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="mb-6">
        <Link href="/profile">
          <a className="block">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white">
                {user.username ? user.username.charAt(0).toUpperCase() : user.walletAddress?.substring(0, 2)}
              </div>
              <div>
                <div className="font-medium">{user.username || 'Anonymous'}</div>
                <div className="text-sm text-gray-500">
                  {user.walletAddress && `${user.walletAddress.substring(0, 4)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`}
                </div>
              </div>
            </div>
          </a>
        </Link>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
          <div className="p-2 bg-light rounded">
            <div className="font-semibold">{user.followers}</div>
            <div className="text-gray-500">Followers</div>
          </div>
          <div className="p-2 bg-light rounded">
            <div className="font-semibold">{user.following}</div>
            <div className="text-gray-500">Following</div>
          </div>
        </div>
      </div>
      
      <nav className="space-y-1">
        <Link href="/">
          <a className="flex items-center space-x-3 p-2 rounded-md hover:bg-light text-gray-700 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </a>
        </Link>
        
        <Link href="/explore">
          <a className="flex items-center space-x-3 p-2 rounded-md hover:bg-light text-gray-700 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Explore</span>
          </a>
        </Link>
        
        <Link href="/notifications">
          <a className="flex items-center space-x-3 p-2 rounded-md hover:bg-light text-gray-700 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifications</span>
          </a>
        </Link>
        
        <Link href="/profile">
          <a className="flex items-center space-x-3 p-2 rounded-md hover:bg-light text-gray-700 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </a>
        </Link>
        
        <Link href="/settings">
          <a className="flex items-center space-x-3 p-2 rounded-md hover:bg-light text-gray-700 hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </a>
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar; 