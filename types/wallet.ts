// Basic interface for the phantom wallet
export interface PhantomWallet {
  publicKey: { toString: () => string };
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
}

// Extended Window interface to include Solana and Phantom
export interface WindowWithSolana extends Window {
  solana?: PhantomWallet;
  phantom?: {
    solana?: PhantomWallet;
  };
}

// Wallet context interface
export interface WalletContextProps {
  walletAddress: string | null;
  walletProvider: PhantomWallet | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  walletConnected: boolean;
  isLoading: boolean;
} 