import { PhantomWallet } from '../types/wallet';

/**
 * Wallet detection and utilities for Phantom wallet
 */

// Check if Phantom wallet is present in the window
export const isPhantomInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const windowObj = window as any;
    // Check for new Phantom provider structure
    if (windowObj.phantom?.solana) {
      return true;
    }
    // Check for old provider structure
    if (windowObj.solana && windowObj.solana.isPhantom) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking for Phantom wallet:', error);
    return false;
  }
};

/**
 * Get the Phantom wallet provider safely
 */
export const getPhantomProvider = (): PhantomWallet | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const windowObj = window as any;
    
    // Check for the new Phantom provider structure
    if (windowObj.phantom?.solana) {
      return windowObj.phantom.solana;
    }
    
    // Check for the old provider structure
    if (windowObj.solana && windowObj.solana.isPhantom) {
      return windowObj.solana;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Phantom provider:', error);
    return null;
  }
};

// Initialize wallet detection
export const initWalletDetection = () => {
  if (typeof window === 'undefined') return true;
  
  // Listen for the Phantom ready event dispatched from _document.tsx
  window.addEventListener('phantomReady', () => {
    console.log('Phantom wallet detected and ready');
  });
  
  // Handle wallet connection errors
  window.addEventListener('unhandledrejection', (event) => {
    // Specially handle wallet connection errors for better user experience
    if (
      event.reason &&
      typeof event.reason.message === 'string' &&
      (
        event.reason.message.includes('User rejected') || 
        event.reason.message.includes('wallet connection') ||
        event.reason.message.includes('WalletConnection')
      )
    ) {
      console.warn('Wallet connection was rejected or failed:', event.reason);
      // Prevent the unhandled promise rejection from propagating
      event.preventDefault();
    }
  });
  
  // Log when window loads to help diagnose timing issues
  window.addEventListener('load', () => {
    console.log('Window loaded, Phantom available:', isPhantomInstalled());
  });
  
  return true;
};

// Simple wallet address formatter
export const formatWalletAddress = (address: string | null): string => {
  if (!address) return '';
  if (address.length <= 8) return address;
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

// Get wallet specific cache key
export const getWalletCacheKey = (key: string, walletAddress: string | null): string => {
  if (!walletAddress) return key;
  return `${key}_${walletAddress}`;
};

// Clear wallet related data from localStorage
export const clearWalletData = (walletAddress: string | null): void => {
  if (!walletAddress) return;
  
  try {
    // Clear aura points
    localStorage.removeItem(`auraPoints_${walletAddress}`);
    
    // Remove from profile data structures
    const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
    const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
    const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
    const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
    
    if (profilePictures[walletAddress]) {
      delete profilePictures[walletAddress];
      localStorage.setItem('profilePictures', JSON.stringify(profilePictures));
    }
    
    if (bannerImages[walletAddress]) {
      delete bannerImages[walletAddress];
      localStorage.setItem('bannerImages', JSON.stringify(bannerImages));
    }
    
    if (usernames[walletAddress]) {
      delete usernames[walletAddress];
      localStorage.setItem('usernames', JSON.stringify(usernames));
    }
    
    if (bios[walletAddress]) {
      delete bios[walletAddress];
      localStorage.setItem('userBios', JSON.stringify(bios));
    }
    
    console.log('Cleared wallet data for', walletAddress);
  } catch (error) {
    console.error('Error clearing wallet data:', error);
  }
}; 