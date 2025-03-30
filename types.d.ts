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

// Type definitions for the GigaAura application - SOLANA ONLY

// Add Phantom wallet integration types to Window
interface Window {
  // Solana and Phantom wallet integration
  solana?: {
    isPhantom?: boolean;
    connect?: (options?: { onlyIfTrusted?: boolean }) => Promise<any>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
    publicKey?: { toString: () => string };
    on?: (event: string, callback: (args: any) => void) => void;
    off?: (event: string, callback: (args: any) => void) => void;
  };
  
  phantom?: {
    solana?: {
      isPhantom?: boolean;
      connect?: (options?: { onlyIfTrusted?: boolean }) => Promise<any>;
      disconnect?: () => Promise<void>;
      signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      publicKey?: { toString: () => string };
      on?: (event: string, callback: (args: any) => void) => void;
      off?: (event: string, callback: (args: any) => void) => void;
    };
  };
  
  // Custom events for Phantom wallet detection
  addEventListener(type: 'phantomReady', listener: (event: CustomEvent) => void): void;
  dispatchEvent(event: Event): boolean;
  removeEventListener(type: 'phantomReady', listener: (event: CustomEvent) => void): void;
} 