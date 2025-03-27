import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@contexts/WalletContext';
import { useSelector } from 'react-redux';
import { RootState } from '@lib/store';

const Header = () => {
  const { disconnect, walletAddress } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const notifications = useSelector((state: RootState) => state.notifications);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const truncateWallet = (address: string | null) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <a className="flex items-center">
                <span className="text-2xl font-bold text-primary">Giga<span className="text-accent">Aura</span></span>
              </a>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className="text-dark hover:text-primary">Home</a>
            </Link>
            <Link href="/explore">
              <a className="text-dark hover:text-primary">Explore</a>
            </Link>
            <Link href="/notifications">
              <a className="text-dark hover:text-primary relative">
                Notifications
                {notifications.unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                  </span>
                )}
              </a>
            </Link>
            <Link href="/profile">
              <a className="text-dark hover:text-primary">Profile</a>
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
              onClick={() => disconnect()}
            >
              {truncateWallet(walletAddress)}
            </button>

            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-4">
              <Link href="/">
                <a className="text-dark hover:text-primary">Home</a>
              </Link>
              <Link href="/explore">
                <a className="text-dark hover:text-primary">Explore</a>
              </Link>
              <Link href="/notifications">
                <a className="text-dark hover:text-primary relative">
                  Notifications
                  {notifications.unreadCount > 0 && (
                    <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                      {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                    </span>
                  )}
                </a>
              </Link>
              <Link href="/profile">
                <a className="text-dark hover:text-primary">Profile</a>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 