import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import { DarkModeProvider } from '../contexts/DarkModeContext';
import { Provider } from 'react-redux';
import { store } from '../lib/store';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
// Import the PostgreSQL database service
import db from '../giga-aura/services/db-init';
// Import Pusher for real-time updates
import pusherClient from '../lib/pusher';

// Configure Pusher logging globally
if (typeof window !== 'undefined') {
  // @ts-ignore - Pusher types are not correctly defined for logToConsole
  pusherClient.logToConsole = process.env.NODE_ENV === 'development';
}

// Error fallback component
const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
      <p className="text-[var(--text-primary)] mb-4">Please try refreshing the page</p>
      <button 
        onClick={() => window.location.href = '/home'} 
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
      >
        Go to Home
      </button>
    </div>
  );
};

// Wrapper component to access wallet context inside app
function AppWithWallet({ Component, pageProps }: AppProps) {
  const [error, setError] = useState<Error | null>(null);
  const { walletAddress } = useWallet();
  
  // Set up Pusher connection monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Monitor Pusher connection
      pusherClient.connection.bind('connected', () => {
        console.log('Pusher connected:', pusherClient.connection.socket_id);
      });
      
      pusherClient.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err);
      });
    }
    
    return () => {
      // Clean up connection listeners
      pusherClient.connection.unbind_all();
    };
  }, []);
  
  // Effect to run on wallet connection
  useEffect(() => {
    if (!walletAddress) return;
    
    try {
      console.log('Wallet connected:', walletAddress);
    } catch (err) {
      console.error('Error initializing with wallet:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [walletAddress]);
  
  if (error) {
    return <ErrorFallback error={error} />;
  }
  
  return <Component {...pageProps} />;
}

// Main app component with error boundary
function MyApp(props: AppProps) {
  // Initialize app services
  useEffect(() => {
    try {
      console.log('App initialized with Pusher real-time updates');
    } catch (err) {
      console.error('Error initializing app:', err);
    }
  }, []);
  
  // Using a try-catch wrapper for the entire app
  return (
    <Provider store={store}>
      <DarkModeProvider>
        <WalletProvider>
          <AppWithWallet {...props} />
          <Toaster position="bottom-center" />
        </WalletProvider>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 