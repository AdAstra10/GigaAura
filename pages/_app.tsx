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
              // Function to safely track wallet providers without modifying ethereum
              function safelyTrackWalletProviders() {
                try {
                  // Initialize provider list if it doesn't exist
                  window._walletProviders = window._walletProviders || [];
                  
                  // Store Phantom wallet if available - avoid touching ethereum completely
                  if (window.phantom && window.phantom.solana && !window._walletProviders.includes(window.phantom.solana)) {
                    window._walletProviders.push(window.phantom.solana);
                  }
                  
                  // Add Solana if available
                  if (window.solana && window.solana.isPhantom && !window._walletProviders.includes(window.solana)) {
                    window._walletProviders.push(window.solana);
                  }
                  
                  // Create a safe method to get the phantom wallet
                  window.getPhantomWallet = function() {
                    // First check our tracked providers
                    if (Array.isArray(window._walletProviders)) {
                      for (let provider of window._walletProviders) {
                        if (provider && provider.isPhantom) {
                          return provider;
                        }
                      }
                    }
                    
                    // Direct checks without modifying anything
                    if (window.phantom && window.phantom.solana) {
                      return window.phantom.solana;
                    }
                    
                    if (window.solana && window.solana.isPhantom) {
                      return window.solana;
                    }
                    
                    return null;
                  };
                } catch (e) {
                  console.error('Error in wallet provider tracking:', e);
                }
              }
              
              // Run immediately
              safelyTrackWalletProviders();
              
              // Run again after delay to catch late injections
              setTimeout(safelyTrackWalletProviders, 1000);
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
          <Head>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Early wallet detection script - must run before other scripts
                  window._phantomWalletRef = null;
                  
                  // Store references to any wallet provider
                  if (window.phantom && window.phantom.solana) {
                    window._phantomWalletRef = window.phantom.solana;
                  } else if (window.solana && window.solana.isPhantom) {
                    window._phantomWalletRef = window.solana;
                  }
                  
                  // Create a safe method to get the phantom wallet that won't conflict with other extensions
                  window.getPhantomWallet = function() {
                    if (window._phantomWalletRef) return window._phantomWalletRef;
                    
                    if (window.phantom && window.phantom.solana) {
                      window._phantomWalletRef = window.phantom.solana;
                      return window._phantomWalletRef;
                    }
                    
                    if (window.solana && window.solana.isPhantom) {
                      window._phantomWalletRef = window.solana;
                      return window._phantomWalletRef;
                    }
                    
                    return null;
                  };
                `
              }}
            />
          </Head>
          <WalletProviderIsolation />
          <AppWithWallet Component={Component} pageProps={pageProps} />
          <Toaster position="bottom-center" />
        </WalletProvider>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 