import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout } from '@lib/slices/userSlice';

type PhantomEvent = 'connect' | 'disconnect';

interface PhantomProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, callback: () => void) => void;
  isPhantom: boolean;
  publicKey?: { toString: () => string };
}

type WindowWithSolana = Window & { 
  solana?: PhantomProvider;
};

interface WalletContextProps {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  walletAddress: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasPhantomWallet: boolean;
}

const WalletContext = createContext<WalletContextProps>({
  connect: async () => null,
  disconnect: async () => {},
  walletAddress: null,
  isConnecting: false,
  isConnected: false,
  hasPhantomWallet: false,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddr] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPhantomWallet, setHasPhantomWallet] = useState(false);
  const dispatch = useDispatch();

  // Simple function to get Phantom provider - no fancy handling that might conflict
  const getPhantomProvider = (): PhantomProvider | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Access the solana property directly
      const solana = (window as WindowWithSolana).solana;
      if (solana?.isPhantom) {
        return solana;
      }
      return null;
    } catch (error) {
      console.error('Error detecting Phantom wallet:', error);
      return null;
    }
  };

  // Check for Phantom wallet availability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if Phantom wallet is available
    const checkForPhantom = () => {
      const provider = getPhantomProvider();
      if (provider) {
        setHasPhantomWallet(true);
        
        // Handle wallet events
        const handleConnect = () => {
          if (provider.publicKey) {
            const addr = provider.publicKey.toString();
            setWalletAddr(addr);
            dispatch(setWalletAddress(addr));
          }
        };
        
        const handleDisconnect = () => {
          setWalletAddr(null);
          dispatch(logout());
        };
        
        // Set up event listeners
        provider.on('connect', handleConnect);
        provider.on('disconnect', handleDisconnect);
        
        // Check for existing connection
        if (provider.publicKey) {
          handleConnect();
        }
      }
    };
    
    // Check for Phantom immediately, then check again after a delay
    checkForPhantom();
    const checkAgainTimeout = setTimeout(checkForPhantom, 1000);
    
    return () => clearTimeout(checkAgainTimeout);
  }, [dispatch]);

  // Connect to wallet
  const connect = async (): Promise<string | null> => {
    try {
      setIsConnecting(true);
      const provider = getPhantomProvider();
      
      if (!provider) {
        throw new Error("Phantom wallet not found! Please install it.");
      }
      
      const response = await provider.connect();
      const addr = response.publicKey.toString();
      
      setWalletAddr(addr);
      dispatch(setWalletAddress(addr));
      
      return addr;
    } catch (error) {
      console.error("Error connecting to Phantom wallet:", error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from wallet
  const disconnect = async (): Promise<void> => {
    try {
      const provider = getPhantomProvider();
      
      if (provider) {
        await provider.disconnect();
        setWalletAddr(null);
        dispatch(logout());
      }
    } catch (error) {
      console.error("Error disconnecting from Phantom wallet:", error);
    }
  };

  return (
    <WalletContext.Provider value={{
      connect,
      disconnect,
      walletAddress,
      isConnecting,
      isConnected: !!walletAddress,
      hasPhantomWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}; 