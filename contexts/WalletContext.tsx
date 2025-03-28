import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout } from '../lib/slices/userSlice';

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
}

// Default context values
const WalletContext = createContext<WalletContextProps>({
  connect: async () => null,
  disconnect: async () => {},
  walletAddress: null,
  isConnecting: false,
  isConnected: false,
  hasPhantomWallet: false,
});

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
          dispatch(setWalletAddress(address));
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
              dispatch(setWalletAddress(address));
            }
          }
        });
        
        (window as WindowWithSolana).solana?.on('disconnect', () => {
          setWalletAddr(null);
          dispatch(logout());
        });
      } catch (err) {
        console.error('Failed to set wallet event listeners', err);
      }
    }
  }, [dispatch]);

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
      
      // Display confirmation dialog
      const userConfirmed = window.confirm("Please connect your wallet to interact. Would you like to connect now?");
      
      if (!userConfirmed) {
        return null;
      }
      
      const response = await solanaProvider.connect();
      const address = response.publicKey.toString();
      
      setWalletAddr(address);
      dispatch(setWalletAddress(address));
      
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 