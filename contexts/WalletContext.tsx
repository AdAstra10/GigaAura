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
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const dispatch = useDispatch();

  // Safely get Phantom provider to prevent conflicts with other wallet extensions
  const getPhantomProvider = (): PhantomProvider | null => {
    try {
      // Use a more defensive approach to check for solana provider
      if (typeof window !== 'undefined' && 'solana' in window) {
        const solana = (window as WindowWithSolana).solana;
        if (solana?.isPhantom) {
          return solana;
        }
      }
      return null;
    } catch (error) {
      console.error('Error detecting Phantom wallet:', error);
      return null;
    }
  };

  // Initialize wallet provider
  useEffect(() => {
    // Prevent this code from running during SSR
    if (typeof window === 'undefined') return;
    
    const checkForPhantom = () => {
      try {
        const detectedProvider = getPhantomProvider();
        if (detectedProvider) {
          setHasPhantomWallet(true);
          setProvider(detectedProvider);
          
          // Check if already connected
          if (detectedProvider.publicKey) {
            const walletAddr = detectedProvider.publicKey.toString();
            setWalletAddr(walletAddr);
            dispatch(setWalletAddress(walletAddr));
          }
        }
      } catch (error) {
        console.error('Error in wallet detection:', error);
      }
    };
    
    // Check for Phantom immediately
    checkForPhantom();
    
    // Re-check if window.solana is set later (Phantom can load after page)
    const checkAgainTimeout = setTimeout(checkForPhantom, 1000);
    return () => clearTimeout(checkAgainTimeout);
  }, [dispatch]);

  // Set up event listeners once provider is available
  useEffect(() => {
    if (!provider) return;
    
    const handleConnect = () => {
      try {
        if (provider.publicKey) {
          const walletAddr = provider.publicKey.toString();
          setWalletAddr(walletAddr);
          dispatch(setWalletAddress(walletAddr));
        }
      } catch (error) {
        console.error('Error handling wallet connect:', error);
      }
    };
    
    const handleDisconnect = () => {
      try {
        setWalletAddr(null);
        dispatch(logout());
      } catch (error) {
        console.error('Error handling wallet disconnect:', error);
      }
    };
    
    // Add event listeners
    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);
    
    // Check connection status immediately
    if (provider.publicKey) {
      handleConnect();
    }
    
    // Cleanup listeners
    return () => {
      // No explicit way to remove listeners in the Phantom API
      // But we're cleaning up by separating the concerns
    };
  }, [provider, dispatch]);

  const connect = async (): Promise<string | null> => {
    try {
      if (!provider) {
        const detectedProvider = getPhantomProvider();
        if (!detectedProvider) {
          throw new Error("Phantom wallet not found! Please install it.");
        }
        setProvider(detectedProvider);
      }
      
      const currentProvider = provider || getPhantomProvider();
      if (!currentProvider) {
        throw new Error("Phantom wallet not found! Please install it.");
      }
      
      setIsConnecting(true);
      const response = await currentProvider.connect();
      const walletAddr = response.publicKey.toString();
      
      setWalletAddr(walletAddr);
      dispatch(setWalletAddress(walletAddr));
      
      return walletAddr;
    } catch (error) {
      console.error("Error connecting to Phantom wallet:", error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      const currentProvider = provider || getPhantomProvider();
      
      if (currentProvider) {
        await currentProvider.disconnect();
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