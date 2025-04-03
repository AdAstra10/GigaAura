import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { setWalletAddress, logout, setUser } from '../lib/slices/userSlice';
import { loadWalletPoints, loadFromStorage } from '../lib/slices/auraPointsSlice';
import { toast } from 'react-hot-toast';
import { getWalletAuraPoints } from '../services/cache';
import db from '../services/db';

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
  connected: boolean;
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

// Load Aura Points from cloud database first, then fallback to localStorage
const loadWalletAuraPoints = (address: string, dispatch: any) => {
  try {
    console.log(`LOADING AURA POINTS FOR ${address} FROM CLOUD...`);
    
    // First try to load from cloud database
    db.getAuraPoints(address)
      .then(cloudPoints => {
        if (cloudPoints) {
          console.log(`FOUND CLOUD AURA POINTS for ${address}:`, cloudPoints);
          dispatch(loadFromStorage(cloudPoints));
          return true;
        }
        return false;
      })
      .catch(error => {
        console.error('Error loading aura points from cloud:', error);
        return false;
      })
      .then(cloudSuccess => {
        // If cloud failed, try local storage (as fallback)
        if (!cloudSuccess) {
          console.log('Cloud database failed, trying localStorage fallbacks...');
          
          // 1. FIRST TRY DIRECT BACKUP
          const directBackupKey = `aura_direct_${address.toLowerCase()}`;
          const directData = localStorage.getItem(directBackupKey);
          
          if (directData) {
            try {
              const parsedDirect = JSON.parse(directData);
              console.log(`FOUND DIRECT AURA BACKUP for ${address}:`, parsedDirect);
              
              if (parsedDirect && typeof parsedDirect === 'object' && 'totalPoints' in parsedDirect) {
                dispatch(loadWalletPoints(parsedDirect));
                return;
              }
            } catch (e) {
              console.error('Error parsing direct aura backup:', e);
            }
          }
          
          // 2. TRY SIMPLIFIED TOTAL
          const simpleTotalKey = `aura_total_${address.toLowerCase()}`;
          const simpleTotal = localStorage.getItem(simpleTotalKey);
          
          if (simpleTotal) {
            const totalPoints = parseInt(simpleTotal, 10);
            if (!isNaN(totalPoints)) {
              console.log(`FOUND SIMPLE TOTAL for ${address}:`, totalPoints);
              dispatch(loadWalletPoints(totalPoints));
              return;
            }
          }
          
          // 3. TRY EMERGENCY BACKUP
          const emergencyKey = `emergency_aura_${address}`;
          const emergencyData = localStorage.getItem(emergencyKey);
          
          if (emergencyData) {
            const emergencyPoints = parseInt(emergencyData, 10);
            if (!isNaN(emergencyPoints)) {
              console.log(`FOUND EMERGENCY BACKUP for ${address}:`, emergencyPoints);
              dispatch(loadWalletPoints(emergencyPoints));
              return;
            }
          }
          
          // 4. TRY CACHE SERVICE
          const auraPointsState = getWalletAuraPoints(address);
          
          if (auraPointsState && typeof auraPointsState === 'object') {
            console.log(`FOUND CACHE SERVICE DATA for ${address}:`, auraPointsState);
            dispatch(loadWalletPoints(auraPointsState));
            return;
          }
          
          // 5. DEFAULT TO INITIAL VALUE
          console.log(`NO VALID AURA POINTS FOUND for ${address}, using default`);
          dispatch(loadWalletPoints(100)); // Default
        }
      });
  } catch (error) {
    console.error("Error in loadWalletAuraPoints:", error);
    dispatch(loadWalletPoints(100)); // Default
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
        
        // Check if we have a saved wallet address in localStorage first
        const savedWalletAddress = localStorage.getItem('walletAddress');
        const walletWasConnected = localStorage.getItem('walletConnected') === 'true';
        
        if (savedWalletAddress && walletWasConnected) {
          console.log("Found saved wallet address:", savedWalletAddress);
        }
        
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
                
                // Save the wallet address in localStorage
                localStorage.setItem('walletAddress', address);
                localStorage.setItem('walletConnected', 'true');
                
                loadWalletAuraPoints(address, dispatch);
                loadUserProfileData(address); // Load profile data here
                console.log("Auto-connected to wallet:", address);
              } else {
                console.error("Couldn't extract address from publicKey");
                
                // Try to use saved address if available
                if (savedWalletAddress) {
                  setWalletState(savedWalletAddress);
                  setWalletConnected(true);
                  dispatch(setWalletAddress(savedWalletAddress));
                  loadWalletAuraPoints(savedWalletAddress, dispatch);
                  loadUserProfileData(savedWalletAddress);
                  console.log("Using saved wallet address:", savedWalletAddress);
                }
              }
            }
          } catch (error) {
            // Not connected yet (normal, will connect later when user clicks)
            console.log("Wallet not auto-connected. Using saved wallet if available.");
            
            // Try to use saved address if available
            if (savedWalletAddress && walletWasConnected) {
              setWalletState(savedWalletAddress);
              setWalletConnected(true);
              dispatch(setWalletAddress(savedWalletAddress));
              loadWalletAuraPoints(savedWalletAddress, dispatch);
              loadUserProfileData(savedWalletAddress);
              console.log("Using saved wallet address:", savedWalletAddress);
            }
          }
        } else {
          console.log("Compatible wallet not found. Please install Phantom wallet extension.");
          
          // Even without wallet extension, try to use saved wallet data
          if (savedWalletAddress && walletWasConnected) {
            setWalletState(savedWalletAddress);
            setWalletConnected(true);
            dispatch(setWalletAddress(savedWalletAddress));
            loadWalletAuraPoints(savedWalletAddress, dispatch);
            loadUserProfileData(savedWalletAddress);
            console.log("Using saved wallet address without provider:", savedWalletAddress);
          }
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
      
      // Save wallet address in localStorage for persistence
      localStorage.setItem('walletAddress', walletAddress);
      localStorage.setItem('walletConnected', 'true');
      console.log('Wallet connected and saved to localStorage:', walletAddress);
      
      // Load data for this wallet address
      loadWalletAuraPoints(walletAddress, dispatch);
      loadUserProfileData(walletAddress);
      
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
      }
      setWalletState(null);
      setWalletConnected(false);
      setWalletProvider(null);
      dispatch(logout());
      
      // Clear the wallet data from localStorage
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletConnected');
      
      console.log("Wallet disconnected and removed from localStorage");
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
        connected: walletConnected,
        isLoading
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 