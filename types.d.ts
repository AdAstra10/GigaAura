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

// Phantom Wallet Types
interface Window {
  solana?: {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    on: (event: string, callback: () => void) => void;
    publicKey?: { toString: () => string };
  };
  phantom?: {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: () => void) => void;
      publicKey?: { toString: () => string };
    };
  };
} 