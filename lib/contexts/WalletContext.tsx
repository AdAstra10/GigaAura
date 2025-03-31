import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout, setUser } from '../../lib/slices/userSlice';
import { loadWalletPoints } from '../../lib/slices/auraPointsSlice';
import { toast } from 'react-hot-toast';
import { AppDispatch } from '../../lib/store';

// Base interface to ensure we have proper typing
interface WalletContextType {
  walletAddress: string | null;
  connected: boolean;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  connected: false,
  connecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

// Safe function to extract address from public key - prevents toString errors
const safeGetAddress = (publicKey: any): string | null => {
  try {
    // First check if the public key is valid
    if (!publicKey) {
      return null;
    }
    
    // Check if it's an object with expected properties
    if (typeof publicKey !== 'object') {
      return null;
    }
    
    // Try to access the toString method safely
    if (typeof publicKey.toString === 'function') {
      return publicKey.toString();
    }
    
    // Handle case where toString is unavailable but toBase58 exists (Solana specific)
    if (typeof publicKey.toBase58 === 'function') {
      return publicKey.toBase58();
    }
    
    // Last resort - try to get the address from known key formats
    if (publicKey.publicKey && typeof publicKey.publicKey.toString === 'function') {
      return publicKey.publicKey.toString();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting wallet address:', error);
    return null;
  }
};

// Add this helper function to get the provider
const getProvider = () => {
  try {
    const windowObj = window as WindowWithSolana;
    if (windowObj.solana?.isPhantom) {
      return windowObj.solana;
    } else if (windowObj.phantom?.solana?.isPhantom) {
      return windowObj.phantom.solana;
    }
    return null;
  } catch (err) {
    console.error("Error accessing wallet provider:", err);
    return null;
  }
};

// Basic interface for the phantom wallet
interface PhantomWallet {
  publicKey: { toString: () => string } | null;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
}

// Extended Window interface to include Solana and Phantom
interface WindowWithSolana extends Window {
  solana?: PhantomWallet;
  phantom?: {
    solana?: PhantomWallet;
  };
}

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletState] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);

  const dispatch = useDispatch<AppDispatch>();

  // Load user profile data from localStorage based on wallet address
  const loadUserProfileData = (address: string) => {
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

  // Check if wallet is already connected on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Safely check if Phantom wallet is installed
        const phantom = window.phantom?.solana;
        
        if (phantom) {
          try {
            // Check if wallet is already connected
            const response = await phantom.connect({ onlyIfTrusted: true });
            const address = safeGetAddress(response.publicKey);
            
            if (address) {
              setWalletState(address);
              setConnected(true);
              dispatch(setWalletAddress(address));
              loadWalletAuraPoints(address);
              loadUserProfileData(address); // Load profile data here
              console.log('Auto-connected to wallet:', address);
            }
          } catch (error) {
            // Silent fail for auto-connection - this is expected if not previously connected
            console.log('Compatible wallet not found. Please install Phantom wallet extension.');
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  // Load Aura Points from localStorage or initialize to default value
  const loadWalletAuraPoints = (address: string) => {
    try {
      const pointsStr = localStorage.getItem(`auraPoints_${address}`);
      const points = pointsStr ? parseInt(pointsStr, 10) : 100;
      dispatch(loadWalletPoints(points));
    } catch (error) {
      console.error("Error loading Aura Points:", error);
      dispatch(loadWalletPoints(100)); // Default
    }
  };

  // Connect to Phantom wallet
  const connectWallet = async () => {
    try {
      setConnecting(true);
      
      // Check if Phantom is installed
      const phantom = window.phantom?.solana;
      
      if (!phantom) {
        toast.error('Phantom wallet not found. Please install Phantom wallet extension.');
        return;
      }

      try {
        // Request connection to wallet
        const response = await phantom.connect();
        const address = safeGetAddress(response.publicKey);
        
        if (address) {
          setWalletState(address);
          setConnected(true);
          dispatch(setWalletAddress(address));
          loadWalletAuraPoints(address);
          loadUserProfileData(address); // Load profile data here
          toast.success('Wallet connected!');
        } else {
          throw new Error('Could not extract wallet address');
        }
      } catch (error: any) {
        if (error.message.includes('User rejected')) {
          toast.error('Connection rejected by user.');
        } else {
          toast.error('Error connecting to wallet. Please try again.');
          console.error('Wallet connection error:', error);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error('Unexpected wallet error:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect from wallet
  const disconnectWallet = () => {
    try {
      window.phantom?.solana?.disconnect();
      setWalletState(null);
      setConnected(false);
      dispatch(logout());
      toast.success('Wallet disconnected.');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Error disconnecting wallet.');
    }
  };

  return (
    <WalletContext.Provider value={{
      walletAddress,
      connected,
      connecting,
      connectWallet,
      disconnectWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext);

// Add phantom property to Window interface
declare global {
  interface Window {
    phantom?: {
      solana?: PhantomWallet;
    };
  }
}

export default WalletContext; 