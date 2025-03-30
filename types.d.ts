import { UserState } from './lib/slices/userSlice';
import { PostsState } from './lib/slices/postsSlice';
import { AuraPointsState } from './lib/slices/auraPointsSlice';
import { NotificationsState } from './lib/slices/notificationsSlice';

// Import the store to augment its RootState type
import { store } from './lib/store';

// Augment the RootState type
declare module '@lib/store' {
  // Use a different name to avoid conflict with the exported type
  export interface ExtendedRootState {
    user: UserState;
    posts: PostsState;
    auraPoints: AuraPointsState;
    notifications: NotificationsState;
  }
}

// Add window interfaces for Phantom wallet
interface PhantomProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
  isPhantom?: boolean;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  publicKey?: { toString: () => string };
}

interface PhantomWindow extends Window {
  solana?: PhantomProvider;
  phantom?: {
    solana?: PhantomProvider;
  };
}

// Extend the Window interface
declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: {
      solana?: PhantomProvider;
    };
  }
} 