import { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaBell, FaEnvelope, FaUser } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { RootState } from '../lib/store';
import { useDarkMode } from '../contexts/DarkModeContext';

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const user = useSelector((state: RootState) => state.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSunHovered, setIsSunHovered] = useState(false);
  const [isMoonHovered, setIsMoonHovered] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 header-solid border-b border-gray-200 dark:border-gray-700 thin-borders">
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
              <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect cursor-pointer text-gray-600 dark:text-gray-300">
                <FaBell />
              </div>
            </Link>
            <Link href="/messages">
              <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect cursor-pointer text-gray-600 dark:text-gray-300">
                <FaEnvelope />
              </div>
            </Link>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect text-gray-600 dark:text-gray-300"
              onMouseEnter={() => isDarkMode ? setIsSunHovered(true) : setIsMoonHovered(true)}
              onMouseLeave={() => {setIsSunHovered(false); setIsMoonHovered(false)}}
            >
              {isDarkMode ? 
                <FaSun className={isSunHovered ? "text-sunHover" : ""} /> : 
                <FaMoon className={isMoonHovered ? "text-moonHover" : ""} />
              }
            </button>
            
            <div className="flex items-center">
              <Link href="/profile">
                <div className="flex items-center cursor-pointer">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    {user.username || 'Guest User'}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username || 'User'} className="w-8 h-8 rounded-full" />
                    ) : (
                      <FaUser className="text-gray-500 dark:text-gray-300 text-sm" />
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect focus:outline-none"
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
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 transparent-bg border-b border-gray-200 dark:border-gray-700 thin-borders">
            <div className="flex justify-between items-center p-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect text-gray-600 dark:text-gray-300"
                onMouseEnter={() => isDarkMode ? setIsSunHovered(true) : setIsMoonHovered(true)}
                onMouseLeave={() => {setIsSunHovered(false); setIsMoonHovered(false)}}
              >
                {isDarkMode ? 
                  <FaSun className={isSunHovered ? "text-sunHover" : ""} /> : 
                  <FaMoon className={isMoonHovered ? "text-moonHover" : ""} />
                }
              </button>
              <Link href="/notifications">
                <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect cursor-pointer text-gray-600 dark:text-gray-300">
                  <FaBell />
                </div>
              </Link>
              <Link href="/messages">
                <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover-effect cursor-pointer text-gray-600 dark:text-gray-300">
                  <FaEnvelope />
                </div>
              </Link>
            </div>
            <div className="flex items-center p-2">
              <Link href="/profile">
                <div className="flex items-center cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username || 'User'} className="w-8 h-8 rounded-full" />
                    ) : (
                      <FaUser className="text-gray-500 dark:text-gray-300 text-sm" />
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.username || 'Guest User'}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
