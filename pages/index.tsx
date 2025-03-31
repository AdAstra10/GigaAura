import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Simple index page - absolute minimum code to avoid any possible client-side errors
export default function IndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Simple redirect - no Redux, no state management
    try {
      router.replace('/home');
    } catch (error) {
      console.error('Error redirecting:', error);
      // Last resort - use window.location
      window.location.href = '/home';
    }
  }, [router]);
  
  // Minimal return - just a loading spinner
  return (
    <>
      <Head>
        <title>GigaAura | Loading</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-t-indigo-500 border-indigo-200 rounded-full"></div>
      </div>
    </>
  );
} 