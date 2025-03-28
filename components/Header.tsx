import { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaBell, FaEnvelope } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { RootState } from '../lib/store';
import { useDarkMode } from '../contexts/DarkModeContext';

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { connect, disconnect, connected, publicKey } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <span className="font-bold text-xl cursor-pointer text-primary">
                GigaAura
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/notifications">
              <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-300">
                <FaBell />
              </div>
            </Link>
            <Link href="/messages">
              <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-300">
                <FaEnvelope />
              </div>
            </Link>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            
            {connected ? (
              <div className="flex items-center">
                <Link href="/profile">
                  <div className="flex items-center cursor-pointer">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                      {user.username || publicKey?.toString().substring(0, 4) + '...' + publicKey?.toString().substring(publicKey.toString().length - 4)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username || 'User'} className="w-8 h-8 rounded-full" />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300 text-sm">
                          {(user.username && user.username.charAt(0)) || (publicKey && publicKey.toString().substring(0, 2))}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <button 
                onClick={handleConnectWallet}
                className="bg-primary hover:bg-primary/90 rounded-full border-none text-white font-medium py-2 px-4 cursor-pointer"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobile && isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {isDarkMode ? <FaSun /> : <FaMoon />}
              </button>
              <Link href="/notifications">
                <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-300">
                  <FaBell />
                </div>
              </Link>
              <Link href="/messages">
                <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-300">
                  <FaEnvelope />
                </div>
              </Link>
            </div>
            {connected ? (
              <div className="flex items-center p-2">
                <Link href="/profile">
                  <div className="flex items-center cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username || 'User'} className="w-8 h-8 rounded-full" />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300 text-sm">
                          {(user.username && user.username.charAt(0)) || (publicKey && publicKey.toString().substring(0, 2))}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.username || publicKey?.toString().substring(0, 4) + '...' + publicKey?.toString().substring(publicKey.toString().length - 4)}
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="p-2">
                <button 
                  onClick={handleConnectWallet}
                  className="bg-primary hover:bg-primary/90 rounded-full border-none text-white font-medium py-2 px-4 w-full"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
