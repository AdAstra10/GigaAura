import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout, setUser } from '../lib/slices/userSlice';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';

// Basic interface for the phantom wallet
interface PhantomWallet {
  publicKey: { toString: () => string } | null;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: { toString: () => string } | null }>;
  disconnect: () => Promise<void>;
}

// Extended Window interface to include Solana, Phantom and our custom provider list
interface WindowWithSolana extends Window {
  solana?: PhantomWallet;
  phantom?: {
    solana?: PhantomWallet;
  };
  getPhantomWallet?: () => PhantomWallet | null;
  _walletProviders?: any[];
}

interface WalletContextProps {
  walletAddress: string | null;
  walletProvider: PhantomWallet | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  walletConnected: boolean;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextProps | null>(null);

export const useWallet = (): WalletContextProps => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

// Helper function to safely get wallet address from publicKey object
const safeGetAddress = (publicKey: any): string | null => {
  if (!publicKey) return null;
  try {
    return typeof publicKey.toString === 'function' ? publicKey.toString() : null;
  } catch (error) {
    console.error("Error getting address from publicKey:", error);
    return null;
  }
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletState] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<PhantomWallet | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletDetectionComplete, setWalletDetectionComplete] = useState(false);

  const dispatch = useDispatch();

  // Helper function to safely get Phantom wallet provider using our isolation technique
  const getPhantomProvider = (): PhantomWallet | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const windowObj = window as WindowWithSolana;
      let provider = null;
      
      // Method 1: Use our custom isolation getter (preferred)
      if (typeof windowObj.getPhantomWallet === 'function') {
        provider = windowObj.getPhantomWallet();
        if (provider) return provider;
      }
      
      // Method 2: Scan our custom provider list
      if (Array.isArray(windowObj._walletProviders)) {
        for (const possibleProvider of windowObj._walletProviders) {
          if (possibleProvider && possibleProvider.isPhantom) {
            return possibleProvider;
          }
        }
      }
      
      // Method 3: Traditional phantom detection as fallback
      if (windowObj.phantom?.solana) {
        provider = windowObj.phantom.solana;
      } else if (windowObj.solana?.isPhantom) {
        provider = windowObj.solana;
      }
      
      return provider;
    } catch (error) {
      console.error("Error accessing wallet provider:", error);
      return null;
    }
  };

  // Load user profile data from localStorage based on wallet address
  const loadUserProfileData = (address: string | null) => {
    if (!address) return;
    
    try {
      // Load username
      const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
      const username = usernames[address] || null;

      // Load avatar
      const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
      const avatar = profilePictures[address] || null;

      // Load bio
      const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
      const bio = bios[address] || null;

      // Load banner image
      const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
      const bannerImage = bannerImages[address] || null;

      // Set user data in Redux store
      if (username || avatar || bio || bannerImage) {
        dispatch(setUser({ username, avatar, bio, bannerImage }));
      }

      console.log("Loaded profile data:", { username, avatar, bio, bannerImage });
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  // Initialize wallet connection with more robust detection
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (walletDetectionComplete) return;
        
        setIsLoading(true);
        setWalletDetectionComplete(true);
        
        // Delay wallet detection to ensure our isolation code has run
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get phantom provider using our enhanced helper function
        const provider = getPhantomProvider();
        
        if (provider) {
          setWalletProvider(provider);

          // Check if we're already authorized and connected
          try {
            const response = await provider.connect({ onlyIfTrusted: true });
            
            // Defensive coding - check response exists
            if (!response) {
              console.warn("No response from wallet connect");
              return;
            }
            
            // Safely get address with null checks
            const address = safeGetAddress(response.publicKey);
            
            if (address) {
              setWalletState(address);
              setWalletConnected(true);
              dispatch(setWalletAddress(address));
              loadWalletAuraPoints(address);
              loadUserProfileData(address);
              console.log("Auto-connected to wallet:", address);
            } else {
              console.warn("Connected to wallet but could not get address");
            }
          } catch (error) {
            // Not connected yet (normal, will connect later when user clicks)
            console.log("Wallet not connected yet (expected):", error);
          }
        } else {
          console.log("Phantom wallet not found! Please install Phantom wallet extension.");
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Use setTimeout with a longer delay to ensure browser extensions have time to inject
    const timeoutId = setTimeout(() => {
      checkIfWalletIsConnected();
    }, 1500);
    
    return () => clearTimeout(timeoutId);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletDetectionComplete]);

  // Load Aura Points from localStorage or initialize to default value
  const loadWalletAuraPoints = (address: string | null) => {
    if (!address) return;
    
    try {
      const pointsStr = localStorage.getItem(`auraPoints_${address}`);
      const points = pointsStr ? parseInt(pointsStr, 10) : 100;
      dispatch(loadWalletPoints(points));
    } catch (error) {
      console.error("Error loading Aura Points:", error);
      dispatch(loadWalletPoints(100)); // Default
    }
  };

  // Connect wallet with enhanced error handling
  const connectWallet = async () => {
    setIsLoading(true);
    
    try {
      // Wait a moment to ensure our isolation script has had time to run
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get provider using our enhanced helper function
      const provider = getPhantomProvider();

      if (!provider) {
        alert("Phantom wallet not installed. Please install it from phantom.app");
        return;
      }

      try {
        const response = await provider.connect();
        
        // Defensive coding - check response exists
        if (!response) {
          alert("Error connecting to wallet: No response from wallet");
          return;
        }
        
        // Safely get address with null checks
        const address = safeGetAddress(response.publicKey);
        
        if (address) {
          // Set wallet state and dispatch to Redux
          setWalletState(address);
          setWalletConnected(true);
          setWalletProvider(provider);
          dispatch(setWalletAddress(address));
          
          // Load data for this wallet address
          loadWalletAuraPoints(address);
          loadUserProfileData(address);
          console.log("Connected to wallet:", address);
        } else {
          console.error("Failed to get publicKey from wallet connection");
          alert("Could not connect to wallet. Please try again.");
        }
      } catch (err) {
        console.error("Error during wallet connection:", err);
        alert("Failed to connect to wallet. Please try again.");
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (walletProvider) {
        await walletProvider.disconnect();
        setWalletState(null);
        setWalletConnected(false);
        setWalletProvider(null);
        dispatch(logout());
        console.log("Wallet disconnected");
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletProvider,
        connectWallet,
        disconnectWallet,
        walletConnected,
        isLoading
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 