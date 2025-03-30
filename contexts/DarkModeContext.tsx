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
  // Initialize with a default of light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Check for stored preference and system preference on mount
  useEffect(() => {
    const loadDarkMode = () => {
      // First try to load from localStorage
      const storedDarkMode = localStorage.getItem('darkMode');
      
      if (storedDarkMode !== null) {
        // User has a preference
        return storedDarkMode === 'true';
      } else {
        // No saved preference, check system preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    };
    
    // Set dark mode based on stored preferences
    setIsDarkMode(loadDarkMode());
  }, []);
  
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
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}; 