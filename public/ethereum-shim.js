/**
 * GigaAura Wallet Extension Error Handler
 * 
 * Comprehensive solution to prevent errors from Ethereum wallet extensions
 * when using only Solana/Phantom wallet
 */

(function() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Run as early as possible
  try {
    console.log('Initializing GigaAura wallet protection');
    
    // Create a no-op stub for ethereum
    const ethereumStub = {
      isMetaMask: false,
      _metamask: { isUnlocked: () => false },
      request: async () => { throw new Error('Ethereum not supported'); },
      on: () => {},
      removeListener: () => {},
      isConnected: () => false
    };
    
    // Block scripts from loading
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name === 'src' && typeof value === 'string' && (
            value.includes('inpage.js') || 
            value.includes('evmAsk.js') ||
            value.includes('metamask') ||
            value.includes('web3modal')
          )) {
            console.warn('GigaAura blocked script:', value);
            return element;
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      return element;
    };
    
    // Intercept script execution
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
      if (child.tagName === 'SCRIPT' && child.src && (
        child.src.includes('inpage.js') || 
        child.src.includes('evmAsk.js') ||
        child.src.includes('metamask') ||
        child.src.includes('web3modal')
      )) {
        console.warn('GigaAura blocked script append:', child.src);
        return child; // Don't actually append
      }
      return originalAppendChild.call(this, child);
    };
    
    // Create a more robust way to handle ethereum property
    let ethereumAccessed = false;
    Object.defineProperty(window, 'ethereum', {
      configurable: false,
      enumerable: false,
      get: function() {
        if (!ethereumAccessed) {
          console.warn('Ethereum access blocked by GigaAura');
          ethereumAccessed = true;
        }
        return ethereumStub;
      }
    });
    
    // Also handle web3 property
    Object.defineProperty(window, 'web3', {
      configurable: false,
      enumerable: false,
      value: null
    });
    
    // Create global error handler for any errors that still slip through
    window.addEventListener('error', function(e) {
      if (e && e.error && (
        (e.error.message && (
          e.error.message.includes('ethereum') ||
          e.error.message.includes('web3') ||
          e.error.message.includes('inpage.js') ||
          e.error.message.includes('evmAsk.js')
        )) ||
        (e.filename && (
          e.filename.includes('inpage.js') ||
          e.filename.includes('evmAsk.js')
        ))
      )) {
        console.warn('GigaAura caught wallet error:', e.error ? e.error.message : e.message);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }, true);
    
    console.log('GigaAura wallet protection active');
  } catch (err) {
    console.error('GigaAura protection error:', err);
  }
})(); 