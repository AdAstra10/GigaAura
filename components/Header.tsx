import { useState, useEffect } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../contexts/WalletContext';
import { RootState } from '../lib/store';
import { useDarkMode } from '../contexts/DarkModeContext';
import Image from 'next/image';
import { FaUserCircle } from 'react-icons/fa';

// Define props for the Header component
interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { connectWallet, disconnectWallet, connected, walletAddress } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const auraPoints = useSelector((state: RootState) => state.auraPoints.totalPoints || 0);
  const [displayedPoints, setDisplayedPoints] = useState(auraPoints);
  const [isAnimating, setIsAnimating] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-[var(--border-color)] backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      <div className="flex justify-between items-center h-14 px-4 max-w-6xl mx-auto">
        {/* Left section: Mobile Sidebar Toggle */}
        <div className="flex items-center md:hidden">
          {connected && (
            <button onClick={onToggleMobileSidebar} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username || 'User'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaUserCircle className="w-full h-full text-gray-500" /> 
                )}
              </div>
            </button>
          )}
          {/* Placeholder for unconnected state or if logo is needed */}
          {!connected && <div className="w-8 h-8"></div>} 
        </div>

        {/* Center section: Logo/Title (Optional - kept minimal for now) */}
        <div className="hidden md:block">
          {/* Optionally add logo or title here if needed for desktop */}
        </div>

        {/* Right section: Actions */}
        <div className="flex items-center space-x-3">
          {/* Toggle dark mode button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-black dark:text-white transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <FaSun className="h-5 w-5 sun-icon" />
            ) : (
              <FaMoon className="h-5 w-5 moon-icon" />
            )}
          </button>
          
          {/* Aura Points display - Always visible when connected */}
          {connected && (
            <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-full py-1 px-3">
              <span className={`text-primary font-bold mr-1 ${isAnimating ? 'counter-animate' : ''}`}>
                {displayedPoints}
              </span>
              <span className="text-black dark:text-white text-sm">Aura</span>
            </div>
          )}
          
          {/* Connect Wallet Button or Profile Link */}
          {!connected ? (
            <button 
              onClick={handleConnectWallet}
              className="bg-primary hover:bg-primary-hover rounded-full text-white font-medium text-sm sm:text-base py-1.5 px-3 sm:py-2 sm:px-4 transition-colors"
            >
              Connect
            </button>
          ) : (
             // On desktop, show truncated address or username
             <div className="hidden md:flex items-center p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full cursor-pointer transition-colors">
               <Link href="/profile" className="flex items-center">
                 <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                   {user.avatar ? (
                     <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/>
                   ) : (
                     <FaUserCircle className="w-full h-full text-gray-500" /> 
                   )}
                 </div>
                 <span className="text-sm font-medium text-black dark:text-white">
                   {user.username || truncateWallet(walletAddress || '')}
                 </span>
                </Link>
             </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
