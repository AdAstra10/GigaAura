/**
 * GigaAura Ethereum Protection System v4.0
 * 
 * MINIMAL VERSION - Creates only the absolutely necessary stubs with zero interference with React or DOM
 */

(function() {
  'use strict';

  // Only proceed if we have a window object
  if (typeof window === 'undefined') return;

  try {
    // DO NOT log anything - keep it silent to avoid console pollution
    
    // Define simple stub for ethereum
    const ethereumStub = {
      isMetaMask: false,
      _metamask: { isUnlocked: () => false },
      request: () => Promise.reject(new Error('Not available')),
      on: () => {},
      removeListener: () => {},
      isConnected: () => false,
      // Empty properties to prevent null reference errors
      selectedAddress: null,
      chainId: null
    };
    
    // Only define the properties if they don't already exist
    if (!window.hasOwnProperty('ethereum')) {
      Object.defineProperty(window, 'ethereum', {
        value: ethereumStub,
        writable: false,
        configurable: false
      });
    }
    
    if (!window.hasOwnProperty('web3')) {
      Object.defineProperty(window, 'web3', {
        value: {},
        writable: false,
        configurable: false
      });
    }
    
    // Add very limited error handler that only suppresses the specific errors we're seeing
    window.addEventListener('error', function(e) {
      // Only suppress the specific errors we're targeting
      const errorMsg = e.error?.message || e.message || '';
      if (
        errorMsg.includes('Cannot redefine property: ethereum') ||
        errorMsg.includes('Cannot set property ethereum') ||
        (e.filename && (
          e.filename.includes('inpage.js') ||
          e.filename.includes('evmAsk.js')
        ))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }, true);

  } catch (e) {
    // Silent failure - we don't want to cause any additional errors
  }
})(); 