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

// Script to track Phantom wallet provider
const WalletProviderIsolation = () => {
  return (
    <Head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Secondary wallet tracking to update references after the initial script
              function updatePhantomReference() {
                try {
                  // Initialize if needed
                  window._gigaAuraWallets = window._gigaAuraWallets || {};
                  
                  // Track Phantom wallet
                  if (window.phantom && window.phantom.solana) {
                    window._gigaAuraWallets.phantomWallet = window.phantom.solana;
                  } else if (window.solana && window.solana.isPhantom) {
                    window._gigaAuraWallets.phantomWallet = window.solana;
                  }
                } catch (e) {
                  console.error('Error in Phantom wallet tracking:', e);
                }
              }
              
              // Run multiple times to catch wallet injections at different points
              updatePhantomReference();
              setTimeout(updatePhantomReference, 1000);
              setTimeout(updatePhantomReference, 2000);
              
              // Watch for changes in extensions
              document.addEventListener('DOMContentLoaded', updatePhantomReference);
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