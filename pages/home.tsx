import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../lib/store';
import { addPost, loadFromCache } from '../lib/slices/postsSlice';
import { addTransaction } from '../lib/slices/auraPointsSlice';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import AuraSidebar from '../components/AuraSidebar';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import Feed from '../components/Feed';

const HomePage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { walletAddress, connectWallet, walletConnected } = useWallet();
  const user = useSelector((state: RootState) => state.user);
  const { feed } = useSelector((state: RootState) => state.posts);
  
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    // Load feed from cache when component mounts
    dispatch(loadFromCache());
    setIsLoadingFeed(false);
  }, [dispatch]);

  return (
    <>
      <Head>
        <title>GigaAura | Home</title>
        <meta name="description" content="GigaAura - Connect with others in the Solana ecosystem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3 sidebar-column">
          <Sidebar className="sticky top-20" />
        </div>
        
        <div className="col-span-1 md:col-span-6 content-column">
          <Feed />
        </div>
        
        <div className="hidden md:block md:col-span-3">
          <AuraSidebar />
        </div>
      </main>
    </>
  );
};

export default HomePage; 