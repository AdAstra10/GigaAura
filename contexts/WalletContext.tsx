import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout } from '../lib/slices/userSlice';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';

// Basic interface for the phantom wallet provider
interface PhantomProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
}

// Type for window with solana property
interface WindowWithSolana extends Window {
  solana?: PhantomProvider;
}

interface WalletContextProps {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  walletAddress: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasPhantomWallet: boolean;
  publicKey: string | null;
  wallet: any;
  wallets: any[];
}

// Create a more robust default context with all required properties
const defaultContext: WalletContextProps = {
  connect: async () => null,
  disconnect: async () => {},
  walletAddress: null,
  isConnecting: false,
  isConnected: false,
  hasPhantomWallet: false,
  publicKey: null,
  wallet: null,
  wallets: []
};

// Create the context with proper default values
const WalletContext = createContext<WalletContextProps>(defaultContext);

// Hook for using the wallet context
export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddr] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPhantomWallet, setHasPhantomWallet] = useState(false);
  const dispatch = useDispatch();

  // Load wallet-specific data when wallet connects or changes
  const loadWalletData = (address: string) => {
    try {
      // Load the profile data for this wallet
      const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
      const avatar = profilePictures[address] || null;
      
      const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
      const bannerImage = bannerImages[address] || null;
      
      const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
      const username = usernames[address] || null;
      
      const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
      const bio = bios[address] || null;
      
      dispatch(setWalletAddress(address));
      
      // Load Aura Points for this wallet
      dispatch(loadWalletPoints(address));
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  // Check for stored wallet connection on mount
  useEffect(() => {
    const storedWalletAddress = localStorage.getItem('walletAddress');
    if (storedWalletAddress) {
      setWalletAddr(storedWalletAddress);
      loadWalletData(storedWalletAddress);
    }
  }, [dispatch]);

  // This runs only on client-side thanks to dynamic import with ssr: false
  useEffect(() => {
    // Check if phantom is available
    const checkForPhantom = () => {
      if (typeof window !== 'undefined') {
        const solanaProvider = (window as WindowWithSolana).solana;
        const isPhantomInstalled = solanaProvider?.isPhantom;
        
        setHasPhantomWallet(!!isPhantomInstalled);
        
        // If phantom is installed and already connected, set address
        if (isPhantomInstalled && solanaProvider?.publicKey) {
          const address = solanaProvider.publicKey.toString();
          setWalletAddr(address);
          loadWalletData(address);
          localStorage.setItem('walletAddress', address);
        }
      }
    };
    
    checkForPhantom();
    
    // Set event listeners
    if (typeof window !== 'undefined' && (window as WindowWithSolana).solana?.on) {
      try {
        (window as WindowWithSolana).solana?.on('connect', () => {
          if ((window as WindowWithSolana).solana?.publicKey) {
            const address = (window as WindowWithSolana).solana?.publicKey?.toString() || null;
            if (address) {
              setWalletAddr(address);
              loadWalletData(address);
              localStorage.setItem('walletAddress', address);
            }
          }
        });
        
        (window as WindowWithSolana).solana?.on('disconnect', () => {
          setWalletAddr(null);
          dispatch(logout());
          localStorage.removeItem('walletAddress');
        });

        // Add listener for account change
        (window as WindowWithSolana).solana?.on('accountChanged', () => {
          // When wallet account changes, check if we have a new publicKey
          const newPublicKey = (window as WindowWithSolana).solana?.publicKey;
          
          if (newPublicKey) {
            const newAddress = newPublicKey.toString();
            // If the address has changed, update it
            if (newAddress !== walletAddress) {
              console.log('Wallet changed to:', newAddress);
              setWalletAddr(newAddress);
              loadWalletData(newAddress);
              localStorage.setItem('walletAddress', newAddress);
            }
          } else {
            // If no publicKey after account change, treat as disconnect
            console.log('Wallet disconnected via account change');
            setWalletAddr(null);
            dispatch(logout());
            localStorage.removeItem('walletAddress');
          }
        });
      } catch (err) {
        console.error('Failed to set wallet event listeners', err);
      }
    }

    // Return a cleanup function to remove event listeners
    return () => {
      if (typeof window !== 'undefined' && (window as WindowWithSolana).solana?.on) {
        try {
          // Remove listeners if possible
          // Note: Phantom may not support removeListener directly
        } catch (err) {
          console.error('Failed to clean up wallet event listeners', err);
        }
      }
    };
  }, [dispatch, walletAddress]);

  // Connect wallet function
  const connect = async (): Promise<string | null> => {
    try {
      setIsConnecting(true);
      
      if (typeof window === 'undefined') return null;
      
      const solanaProvider = (window as WindowWithSolana).solana;
      
      if (!solanaProvider?.isPhantom) {
        alert("Phantom wallet not installed. Please install it from phantom.app");
        return null;
      }
      
      // Simplified connect flow
      const response = await solanaProvider.connect();
      const address = response.publicKey.toString();
      
      setWalletAddr(address);
      loadWalletData(address);
      localStorage.setItem('walletAddress', address);
      
      return address;
    } catch (error) {
      console.error("Failed to connect wallet", error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function  
  const disconnect = async (): Promise<void> => {
    try {
      if (typeof window === 'undefined') return;
      
      const solanaProvider = (window as WindowWithSolana).solana;
      
      if (solanaProvider) {
        await solanaProvider.disconnect();
        setWalletAddr(null);
        dispatch(logout());
        localStorage.removeItem('walletAddress');
      }
    } catch (error) {
      console.error("Failed to disconnect wallet", error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        walletAddress,
        isConnecting,
        isConnected: !!walletAddress,
        hasPhantomWallet,
        publicKey: walletAddress,
        wallet: hasPhantomWallet ? (window as any).solana : null,
        wallets: hasPhantomWallet ? [(window as any).solana] : []
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 