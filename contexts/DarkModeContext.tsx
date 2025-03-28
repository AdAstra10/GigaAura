import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../lib/store';
import { setDarkMode } from '../lib/slices/userSlice';

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
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state: RootState) => state.user as { darkMode: boolean });

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initialize dark mode from local storage or user preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      dispatch(setDarkMode(savedDarkMode === 'true'));
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Use system preference as default if no saved preference
      dispatch(setDarkMode(true));
    }
  }, [dispatch]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    dispatch(setDarkMode(newDarkMode));
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode: darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}; 