import { useState } from 'react';
import { useWallet } from '@contexts/WalletContext';

const AuthPage = () => {
  const { connectWallet, connecting, connected } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    
    const hasPhantomWallet = (typeof window !== 'undefined' && !!window.phantom?.solana);
    
    if (!hasPhantomWallet) {
      setError('Phantom wallet not detected. Please install the Phantom browser extension.');
      return;
    }
    
    try {
      await connectWallet();
    } catch (err) {
      setError('An error occurred while connecting to your wallet.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Giga<span className="text-accent">Aura</span>
          </h1>
          <p className="text-gray-600">
            Connect your Phantom Wallet to start earning Aura Points
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-light rounded-lg p-4">
            <h2 className="text-lg font-medium text-dark mb-2">Aura Points System</h2>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Post Creation: +5 Aura Points per post</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Likes Received: +1 Aura Point per like</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Comments Made: +1 Aura Point per comment</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>New Followers: +1 Aura Point per follower</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Shares: +1 Aura Point for both creator and sharer</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg text-sm">
              {error}
              {!window.phantom?.solana && (
                <div className="mt-2">
                  <a 
                    href="https://phantom.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Install Phantom Wallet
                  </a>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {connecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Connect Phantom Wallet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 