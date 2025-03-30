import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout, setUser } from '../lib/slices/userSlice';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';
import { WalletContextProps, PhantomWallet } from '../types/wallet';
import { getPhantomProvider, initWalletDetection } from '../utils/walletHelpers';

// Create context with proper default values
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

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletState] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<PhantomWallet | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();

  // Initialize wallet detection when component mounts
  useEffect(() => {
    initWalletDetection();
  }, []);

  // Load user profile data from localStorage based on wallet address
  const loadUserProfileData = (address: string) => {
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

  // Initialize wallet connection
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        setIsLoading(true);
        
        // Get Phantom provider safely
        const provider = getPhantomProvider();

        if (provider) {
          setWalletProvider(provider);

          // Check if we're already authorized and connected
          try {
            const response = await provider.connect({ onlyIfTrusted: true });
            if (response && response.publicKey) {
              const address = response.publicKey.toString();
              setWalletState(address);
              setWalletConnected(true);
              dispatch(setWalletAddress(address));
              loadWalletAuraPoints(address);
              loadUserProfileData(address);
              console.log("Auto-connected to Phantom wallet:", address);
            }
          } catch (error: any) {
            // Not connected yet (normal, will connect later when user clicks)
            if (error.message && error.message.includes('User rejected')) {
              console.log("Auto-connection was rejected by user");
            } else {
              console.log("Wallet not connected yet (expected)");
            }
          }
        } else {
          console.log("Phantom wallet not found! Please install Phantom wallet extension.");
        }
      } catch (error) {
        console.error("Error checking for wallet connection:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure window and wallet providers are fully initialized
    const timeoutId = setTimeout(() => {
      checkIfWalletIsConnected();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch]); // Only include dispatch in the dependency array

  // Load Aura Points from localStorage or initialize to default value
  const loadWalletAuraPoints = (address: string) => {
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

  // Connect wallet
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      // Get Phantom provider safely
      const provider = getPhantomProvider();

      if (!provider) {
        alert("Phantom wallet not found! Please install the Phantom wallet extension from https://phantom.app/");
        setIsLoading(false);
        return;
      }

      try {
        const response = await provider.connect();
        
        // Safety check for response and publicKey to prevent toString() of null errors
        if (response && response.publicKey) {
          const address = response.publicKey.toString();
          
          // Set wallet state and dispatch to Redux
          setWalletState(address);
          setWalletConnected(true);
          setWalletProvider(provider);
          dispatch(setWalletAddress(address));
          
          // Load data for this wallet address
          loadWalletAuraPoints(address);
          loadUserProfileData(address);
          console.log("Connected to Phantom wallet:", address);
        } else {
          console.error("Failed to get public key from Phantom wallet");
          alert("Failed to connect to Phantom wallet. Please try again.");
        }
      } catch (err: any) {
        // Handle user rejecting the request
        if (err.message && err.message.includes('User rejected')) {
          console.log("User rejected the connection request");
        } else {
          console.error("Error connecting to Phantom wallet:", err);
          alert("Failed to connect to Phantom wallet. Please try again.");
        }
      }
    } catch (error) {
      console.error("Unexpected error while connecting to wallet:", error);
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