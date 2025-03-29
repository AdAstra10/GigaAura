import { useState, useEffect } from 'react';
import { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '../lib/store';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import { loadWalletPoints } from '../lib/slices/auraPointsSlice';
import { updateProfile } from '../lib/slices/userSlice';
import '../styles/globals.css';
import Head from 'next/head';

// Wrapper component to access wallet context inside app
const AppWithWallet = ({ Component, pageProps }: { Component: AppProps['Component']; pageProps: AppProps['pageProps'] }) => {
  const { walletAddress } = useWallet();
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    if (walletAddress) {
      // Reset the loaded state whenever wallet address changes
      setLoaded(false);
    }
  }, [walletAddress]);
  
  useEffect(() => {
    if (walletAddress && !loaded) {
      // Load wallet-specific data when wallet connects
      console.log("Loading data for wallet:", walletAddress);
      
      // Load Aura Points
      try {
        // Try to load aura points from localStorage or set default
        const pointsStr = localStorage.getItem(`auraPoints_${walletAddress}`);
        const points = pointsStr ? parseInt(pointsStr, 10) : 100;
        store.dispatch(loadWalletPoints(points));
      } catch (error) {
        console.error("Error loading aura points:", error);
        store.dispatch(loadWalletPoints(100)); // Default
      }
      
      // Load profile data from localStorage
      try {
        // Load profile picture
        const profilePictures = JSON.parse(localStorage.getItem('profilePictures') || '{}');
        const avatar = profilePictures[walletAddress] || null;
        
        // Load banner image
        const bannerImages = JSON.parse(localStorage.getItem('bannerImages') || '{}');
        const bannerImage = bannerImages[walletAddress] || null;
        
        // Load username
        const usernames = JSON.parse(localStorage.getItem('usernames') || '{}');
        const username = usernames[walletAddress] || null;
        
        // Load bio
        const bios = JSON.parse(localStorage.getItem('userBios') || '{}');
        const bio = bios[walletAddress] || null;
        
        // Update profile in Redux store
        store.dispatch(updateProfile({
          username,
          bio,
          avatar,
          bannerImage
        }));
        
        console.log("Loaded profile data:", { username, avatar });
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
      
      setLoaded(true);
    } else if (!walletAddress) {
      setLoaded(false);
    }
  }, [walletAddress, loaded]);
  
  return <Component {...pageProps} />;
};

// Script to prevent ethereum provider conflicts
const WalletProviderIsolation = () => {
  return (
    <Head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Store any existing window.ethereum instance
              const originalEthereum = window.ethereum;
              
              // Function to safely handle multiple providers
              function safelyHandleProviders() {
                try {
                  // Create a list to store all providers
                  window._walletProviders = window._walletProviders || [];
                  
                  // Add the original provider if it exists
                  if (originalEthereum && !window._walletProviders.includes(originalEthereum)) {
                    window._walletProviders.push(originalEthereum);
                  }
                  
                  // Create a safe getter for wallet detection
                  window.getPhantomWallet = function() {
                    // Look for the Phantom provider in our providers list
                    for (let provider of window._walletProviders) {
                      if (provider && provider.isPhantom) {
                        return provider;
                      }
                    }
                    
                    // Alternative detection for Phantom
                    if (window.phantom && window.phantom.solana) {
                      return window.phantom.solana;
                    }
                    
                    // Alternative backup detection for Solana
                    if (window.solana && window.solana.isPhantom) {
                      return window.solana;
                    }
                    
                    return null;
                  };
                  
                  // Watch for new providers being set
                  Object.defineProperty(window, 'ethereum', {
                    configurable: true,
                    enumerable: true,
                    get: function() {
                      return originalEthereum;
                    },
                    set: function(newValue) {
                      if (newValue && typeof newValue === 'object' && !window._walletProviders.includes(newValue)) {
                        window._walletProviders.push(newValue);
                        console.log('New wallet provider detected and registered safely');
                      }
                      return true;
                    }
                  });
                } catch (e) {
                  console.error('Error in wallet provider isolation:', e);
                }
              }
              
              // Execute immediately
              safelyHandleProviders();
              
              // Also run after a delay to catch late injections
              setTimeout(safelyHandleProviders, 500);
            })();
          `
        }}
      />
    </Head>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <DarkModeProvider>
        <WalletProvider>
          <WalletProviderIsolation />
          <AppWithWallet Component={Component} pageProps={pageProps} />
          <Toaster position="bottom-center" />
        </WalletProvider>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 