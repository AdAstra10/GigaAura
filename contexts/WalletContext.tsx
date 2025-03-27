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

  useEffect(() => {
    const checkForPhantom = () => {
      const { solana } = window as WindowWithSolana;
      if (solana?.isPhantom) {
        setHasPhantomWallet(true);
        
        // Listen for wallet connection/disconnection
        solana.on('connect', () => {
          if (solana.publicKey) {
            const walletAddr = solana.publicKey.toString();
            setWalletAddr(walletAddr);
            dispatch(setWalletAddress(walletAddr));
          }
        });
        
        solana.on('disconnect', () => {
          setWalletAddr(null);
          dispatch(logout());
        });
        
        // Check if already connected
        if (solana.publicKey) {
          const walletAddr = solana.publicKey.toString();
          setWalletAddr(walletAddr);
          dispatch(setWalletAddress(walletAddr));
        }
      }
    };
    
    // Check for Phantom immediately
    checkForPhantom();
    
    // Re-check if window.solana is set later (Phantom can load after page)
    const checkAgainTimeout = setTimeout(checkForPhantom, 1000);
    return () => clearTimeout(checkAgainTimeout);
  }, [dispatch]);

  const connect = async (): Promise<string | null> => {
    try {
      const { solana } = window as WindowWithSolana;
      
      if (!solana) {
        throw new Error("Phantom wallet not found! Please install it.");
      }
      
      setIsConnecting(true);
      const response = await solana.connect();
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
      const { solana } = window as WindowWithSolana;
      
      if (solana) {
        await solana.disconnect();
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