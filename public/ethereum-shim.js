/**
 * Ethereum Shim - Placeholder for Ethereum properties
 * 
 * This script prevents errors from occurring with Ethereum-related injections 
 * when we're only using Solana/Phantom wallet.
 */

(function() {
  // Only run if we're in a browser environment
  if (typeof window === 'undefined') return;

  try {
    // Create a placeholder for ethereum property to prevent errors
    if (!window.hasOwnProperty('ethereum')) {
      Object.defineProperty(window, 'ethereum', {
        value: {
          isMetaMask: false,
          _metamask: { isUnlocked: () => false },
          request: async () => { throw new Error('Ethereum not supported in this app'); },
          on: () => {},
          removeListener: () => {},
          isConnected: () => false
        },
        writable: false,
        configurable: true
      });
    }

    // Prevent errors from third-party libraries trying to inject ethereum
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
      // Block attempts to redefine the ethereum property on window
      if (obj === window && prop === 'ethereum') {
        console.log('Blocked attempt to redefine window.ethereum');
        return obj;
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    console.log('Ethereum shim initialized - Solana-only mode active');
  } catch (error) {
    console.error('Failed to initialize ethereum shim:', error);
  }
})(); 