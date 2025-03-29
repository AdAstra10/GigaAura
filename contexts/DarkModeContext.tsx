import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextProps>({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export const useDarkMode = () => useContext(DarkModeContext);

interface DarkModeProviderProps {
  children: ReactNode;
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({ children }) => {
  // Check localStorage and system preference for initial state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      // First check localStorage
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        return savedMode === 'true';
      }
      
      // Then check system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Default to light mode
    return false;
  });
  
  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);
  
  // Listen for system preference changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if user hasn't set a preference
        if (localStorage.getItem('darkMode') === null) {
          setIsDarkMode(e.matches);
        }
      };
      
      // Add event listener for theme changes
      mediaQuery.addEventListener('change', handleChange);
      
      // Clean up
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}; 