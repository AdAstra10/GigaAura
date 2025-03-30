// This file is to be deprecated - all types have been moved to types.d.ts
// Only keeping this file to fix build issues until all references are removed

// Interface for the Phantom wallet
export interface PhantomWallet {
  publicKey: { toString: () => string };
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
}

// Use type alias to ensure compatibility
export type PhantomProvider = PhantomWallet;

// Extended Window interface to include Solana and Phantom
export interface WindowWithSolana extends Window {
  solana?: PhantomWallet; // Legacy way Phantom injects itself
  phantom?: {
    solana?: PhantomWallet; // Modern way Phantom injects itself (preferred)
  };
}

// Helper function to check if Phantom wallet is installed
export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const win = window as WindowWithSolana;
  return !!(win.phantom?.solana || win.solana?.isPhantom);
}

// Helper function to get the Phantom provider if available
export function getPhantomProvider(): PhantomWallet | null {
  if (typeof window === 'undefined') return null;
  
  const win = window as WindowWithSolana;
  return win.phantom?.solana || (win.solana?.isPhantom ? win.solana : null);
} 