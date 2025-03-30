// Basic interface for the Phantom wallet
export interface PhantomWallet {
  publicKey: { toString: () => string } | null;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom: boolean; // This is guaranteed to be true for Phantom
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
}

// Extended Window interface to include Solana and Phantom
export interface WindowWithSolana extends Window {
  solana?: PhantomWallet; // Legacy way Phantom injects itself
  phantom?: {
    solana?: PhantomWallet; // Modern way Phantom injects itself (preferred)
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