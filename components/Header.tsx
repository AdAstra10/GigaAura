import { useState, useEffect } from 'react';
import { FaMoon, FaSun, FaRegBell, FaRegEnvelope, FaRegUser, FaArrowLeft } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import { RootState } from '../lib/store';
import { useDarkMode } from '../contexts/DarkModeContext';
import Image from 'next/image';

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { connectWallet, disconnectWallet, connected, walletAddress } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const auraPoints = useSelector((state: RootState) => state.auraPoints.totalPoints || 0);
  const [displayedPoints, setDisplayedPoints] = useState(auraPoints);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Update points with animation when they change
  useEffect(() => {
    if (auraPoints !== displayedPoints) {
      animatePointsChange(auraPoints);
    }
  }, [auraPoints]);

  const animatePointsChange = (targetPoints: number) => {
    if (displayedPoints === targetPoints) return;
    
    setIsAnimating(true);
    
    // Determine if points are increasing or decreasing
    const isIncreasing = targetPoints > displayedPoints;
    
    // Calculate steps for animation (faster for larger differences)
    const diff = Math.abs(targetPoints - displayedPoints);
    const steps = Math.min(15, Math.max(5, Math.floor(diff / 10)));
    const stepSize = Math.ceil(diff / steps);
    
    let currentPoints = displayedPoints;
    const intervalId = setInterval(() => {
      if (isIncreasing) {
        currentPoints = Math.min(targetPoints, currentPoints + stepSize);
      } else {
        currentPoints = Math.max(targetPoints, currentPoints - stepSize);
      }
      
      setDisplayedPoints(currentPoints);
      
      if (currentPoints === targetPoints) {
        clearInterval(intervalId);
        setTimeout(() => setIsAnimating(false), 300);
      }
    }, 100);
    
    return () => clearInterval(intervalId);
  };

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
      await connectWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Truncate wallet address for display
  const truncateWallet = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Display header based on route
  const renderPageTitle = () => {
    const path = router.pathname;
    
    switch (true) {
      case path === '/home':
        return 'Home';
      case path === '/explore':
        return 'Explore';
      case path === '/notifications':
        return 'Notifications';
      case path === '/messages':
        return 'Messages';
      case path === '/bookmarks':
        return 'Bookmarks';
      case path === '/profile':
        return 'Profile';
      case path === '/settings':
        return 'Settings';
      case path.includes('/profile/'):
        return 'Profile';
      default:
        return 'GigaAura';
    }
  };

  // Decide if we need a back button
  const shouldShowBackButton = () => {
    return router.pathname !== '/home' && router.pathname !== '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-[var(--border-color)] backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      {/* Mobile and middle-size screen header */}
      <div className="flex justify-between items-center h-14 px-4">
        {/* Left section: Back button or Title */}
        <div className="flex items-center">
          {shouldShowBackButton() ? (
            <button 
              onClick={() => router.back()} 
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center md:hidden">
              {connected && (
                <Link href="/profile">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                        {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                      </div>
                    )}
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
        
        {/* Right section: Actions */}
        <div className="flex items-center space-x-3">
          {/* Toggle dark mode button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-black dark:text-white transition-colors"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <FaSun className="h-5 w-5 sun-icon" />
            ) : (
              <FaMoon className="h-5 w-5 moon-icon" />
            )}
          </button>
          
          {/* Aura Points display - Only visible when connected */}
          {connected && (
            <div className="hidden md:flex items-center bg-gray-200 dark:bg-gray-800 rounded-full py-1 px-3">
              <span className={`text-primary font-bold mr-1 ${isAnimating ? 'counter-animate' : ''}`}>
                {displayedPoints}
              </span>
              <span className="text-black dark:text-white text-sm">Aura</span>
            </div>
          )}
          
          {/* Connect Wallet Button or Profile - Based on connection state */}
          {!connected ? (
            <button 
              onClick={handleConnectWallet}
              className="bg-primary hover:bg-primary-hover rounded-full text-white font-medium py-2 px-4"
            >
              Connect Wallet
            </button>
          ) : (
            <Link href="/profile">
              <div className="flex items-center p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full cursor-pointer transition-colors">
                <div className="mr-2 hidden md:block">
                  <p className="text-sm font-medium text-black dark:text-white">
                    {user.username || truncateWallet(walletAddress || '')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                      {user.username ? user.username.charAt(0).toUpperCase() : walletAddress?.substring(0, 2)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
