import { useEffect } from 'react';
import Head from 'next/head';

// Absolute minimal index page that just redirects to /home
export default function IndexPage() {
  useEffect(() => {
    // Simple window location redirect - most reliable method
    window.location.href = '/home';
  }, []);
  
  // Super minimal return - just a loading spinner
  return (
    <>
      <Head>
        <title>GigaAura | Redirecting...</title>
      </Head>
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
      </div>
    </>
  );
} 