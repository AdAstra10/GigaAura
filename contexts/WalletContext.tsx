import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout, setUser } from '../lib/slices/userSlice';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';
import { toast } from 'react-hot-toast';

// Basic interface for the phantom wallet
interface PhantomWallet {
  publicKey: { toString: () => string } | null;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
}

// Extended Window interface to include Solana and Phantom
interface WindowWithSolana extends Window {
  solana?: PhantomWallet;
  phantom?: {
    solana?: PhantomWallet;
  };
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

// Safe function to get address from public key
const safeGetAddress = (publicKey: any): string => {
  if (!publicKey) return '';
  
  try {
    // Multiple safety checks
    if (typeof publicKey === 'string') return publicKey;
    
    if (publicKey && typeof publicKey.toString === 'function') {
      return publicKey.toString();
    }
    
    return String(publicKey) || '';
  } catch (error) {
    console.warn('Error getting address from public key:', error);
    return '';
  }
};

// Add this helper function to get the provider
const getProvider = () => {
  try {
    const windowObj = window as WindowWithSolana;
    
    // Primary check for Phantom
    if (windowObj.phantom?.solana?.isPhantom) {
      return windowObj.phantom.solana;
    } 
    // Secondary check for older Phantom versions
    else if (windowObj.solana?.isPhantom) {
      return windowObj.solana;
    }
    
    // If Phantom is not installed, suggest installation
    return null;
  } catch (err) {
    console.error("Error accessing wallet provider:", err);
    return null;
  }
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletState] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<PhantomWallet | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();

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

  // Initialize wallet connection
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        setIsLoading(true);
        
        // Try to safely get the provider without conflicting with other wallet extensions
        const provider = getProvider();

        if (provider) {
          setWalletProvider(provider);

          // Check if we're already authorized and connected
          try {
            const response = await provider.connect({ onlyIfTrusted: true });
            
            // Guard against null publicKey
            if (response && response.publicKey) {
              const address = safeGetAddress(response.publicKey);
              
              if (address) {
                setWalletState(address);
                setWalletConnected(true);
                dispatch(setWalletAddress(address));
                loadWalletAuraPoints(address);
                loadUserProfileData(address); // Load profile data here
                console.log("Auto-connected to wallet:", address);
              } else {
                console.error("Couldn't extract address from publicKey");
              }
            }
          } catch (error) {
            // Not connected yet (normal, will connect later when user clicks)
            console.log("Wallet not connected yet (expected)");
          }
        } else {
          console.log("Compatible wallet not found. Please install Phantom wallet extension.");
        }
      } catch (error) {
        console.error("Wallet initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      checkIfWalletIsConnected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      
      // Check if phantom is installed
      const provider = getProvider();
      
      if (!provider) {
        // Use a simpler toast without action
        toast.error("Phantom wallet not found. Please install Phantom wallet extension.");
        
        // After a delay, open a prompt to install
        setTimeout(() => {
          const shouldInstall = window.confirm('Would you like to install Phantom wallet?');
          if (shouldInstall) {
            window.open('https://phantom.app/', '_blank');
          }
        }, 1000);
        
        setIsLoading(false);
        return;
      }
      
      // Connect to phantom
      const response = await provider.connect();
      
      // Safely get the wallet address
      const walletAddress = safeGetAddress(response.publicKey);
      
      // Update wallet contexts
      setWalletState(walletAddress);
      setWalletConnected(true);
      setWalletProvider(provider);
      dispatch(setWalletAddress(walletAddress));
      
      // Load data for this wallet address
      loadWalletAuraPoints(walletAddress);
      loadUserProfileData(walletAddress);
      
      localStorage.setItem('walletConnected', 'true');
      
      // Show success toast
      toast.success("Wallet connected successfully!");
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      
      // More detailed error message
      let errorMessage = "Failed to connect to wallet. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = "You rejected the connection request. Please try again.";
        }
      }
      
      toast.error(errorMessage);
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