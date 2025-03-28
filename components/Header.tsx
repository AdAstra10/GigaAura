import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import Link from 'next/link';
import Image from 'next/image';
import router from 'next/router';
import { Bell, Search, Menu, X } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { walletAddress, username, isAuthenticated } = useSelector((state: RootState) => state.user);
  const { connect } = useWallet();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleConnectWallet = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden -ml-2 mr-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open menu</span>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Logo */}
            <Link href="/">
              <div className="flex-shrink-0 flex items-center cursor-pointer">
                <Image 
                  src="/images/GigaAuraLandscapeLogo.png" 
                  alt="GigaAura" 
                  width={140} 
                  height={40} 
                  className="h-10 w-auto" 
                  priority
                />
              </div>
            </Link>
          </div>
          
          {/* Search */}
          <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
            <div className="max-w-lg w-full lg:max-w-xs">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>
          </div>
          
          {/* Nav Links */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                <Link href="/notifications">
                  <div className="p-2 text-gray-400 hover:text-primary cursor-pointer">
                    <span className="sr-only">Notifications</span>
                    <Bell size={20} />
                  </div>
                </Link>
                
                <Link href="/profile">
                  <div className="ml-4 flex items-center cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-medium">
                      {username?.charAt(0) || walletAddress?.charAt(0) || '?'}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                      {username || walletAddress?.substring(0, 6) + '...' + walletAddress?.slice(-4)}
                    </span>
                  </div>
                </Link>
              </>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="ml-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/">
              <div 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Home
              </div>
            </Link>
            <Link href="/explore">
              <div
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Explore
              </div>
            </Link>
            <Link href="/notifications">
              <div
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Notifications
              </div>
            </Link>
            <Link href="/profile">
              <div
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </div>
            </Link>
            <Link href="/settings">
              <div
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </div>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 