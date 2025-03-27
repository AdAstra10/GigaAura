import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSelector } from 'react-redux';
import { RootState } from '@lib/store';
import { useWallet } from '@contexts/WalletContext';
import Header from '@components/Header';
import Feed from '@components/Feed';
import AuthPage from '@components/AuthPage';
import Sidebar from '@components/Sidebar';
import AuraSidebar from '@components/AuraSidebar';

export default function Home() {
  const { isConnected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary text-2xl">Loading GigaAura...</div>
      </div>
    );
  }

  if (!isConnected || !user.isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <Head>
        <title>GigaAura | Social Media with Crypto Wallet Integration</title>
        <meta name="description" content="Connect your Phantom Wallet and start earning Aura Points by engaging with the community" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-light">
        <Header />
        
        <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3">
            <Sidebar />
          </div>
          
          <div className="col-span-1 md:col-span-6">
            <Feed />
          </div>
          
          <div className="hidden md:block md:col-span-3">
            <AuraSidebar />
          </div>
        </main>
      </div>
    </>
  );
} 