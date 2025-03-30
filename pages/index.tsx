import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useDispatch } from 'react-redux';
import { loadFromCache } from '../lib/slices/postsSlice';

// Simple index page that just redirects to /home to avoid any client-side errors
export default function IndexPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Load posts data from cache
    try {
      dispatch(loadFromCache());
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    
    // Redirect to the home page
    router.replace('/home');
  }, [dispatch, router]);
  
  return (
    <>
      <Head>
        <title>GigaAura | Loading...</title>
        <meta name="description" content="GigaAura - Social media platform with Solana integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
      </div>
    </>
  );
} 