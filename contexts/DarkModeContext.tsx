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
  // Initialize with a default of light mode but will be updated in useEffect
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Check for stored preference and system preference on mount
  useEffect(() => {
    console.log('Initializing dark mode...');
    const loadDarkMode = () => {
      // First try to load from localStorage
      try {
        const storedDarkMode = localStorage.getItem('darkMode');
        
        if (storedDarkMode !== null) {
          // User has a preference
          console.log('Found stored dark mode preference:', storedDarkMode);
          return storedDarkMode === 'true';
        } else {
          // No saved preference, check system preference
          const systemPreference = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          console.log('Using system dark mode preference:', systemPreference);
          return systemPreference;
        }
      } catch (error) {
        console.error('Error loading dark mode preference:', error);
        return false;
      }
    };
    
    // Set dark mode based on stored preferences or system preference
    const darkModeValue = loadDarkMode();
    setIsDarkMode(darkModeValue);
  }, []);
  
  // Apply dark mode class to document whenever isDarkMode changes
  useEffect(() => {
    console.log('Applying dark mode classes, isDarkMode:', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    try {
      localStorage.setItem('darkMode', isDarkMode.toString());
      console.log('Saved dark mode preference:', isDarkMode);
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  }, [isDarkMode]);
  
  const toggleDarkMode = () => {
    console.log('Toggling dark mode from', isDarkMode, 'to', !isDarkMode);
    setIsDarkMode(prev => !prev);
  };
  
  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}; 