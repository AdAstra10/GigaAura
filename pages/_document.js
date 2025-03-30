import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Preload script with highest priority - must run BEFORE any other script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Immediately capture and protect ethereum
                (function() {
                  // Create safe environment for wallets
                  window._gigaAuraWallets = {};
                  var _didInit = false;
                  
                  // Original property descriptor if ethereum exists
                  var _originalDesc = Object.getOwnPropertyDescriptor(window, 'ethereum');
                  var _originalEthereum = window.ethereum;
                  
                  // Wallet references
                  var _phantomRef = null;
                  
                  // Capture Phantom if it exists
                  function capturePhantom() {
                    try {
                      if (window.phantom && window.phantom.solana) {
                        _phantomRef = window.phantom.solana;
                        window._gigaAuraWallets.phantomWallet = _phantomRef;
                      } else if (window.solana && window.solana.isPhantom) {
                        _phantomRef = window.solana;
                        window._gigaAuraWallets.phantomWallet = _phantomRef;
                      }
                    } catch(e) {
                      console.warn('Error capturing phantom reference:', e);
                    }
                  }
                  
                  // Save ethereum in isolated reference
                  if (window.ethereum) {
                    window._gigaAuraWallets.ethereum = window.ethereum;
                  }
                  
                  // Aggressive override of property definition functions
                  var _originalDefineProperty = Object.defineProperty;
                  var _originalDefineProperties = Object.defineProperties;
                  
                  // Create phantom getter with multiple fallbacks
                  window.getPhantomWallet = function() {
                    // Try captured reference
                    if (_phantomRef) return _phantomRef;
                    
                    // Try in storage
                    if (window._gigaAuraWallets && window._gigaAuraWallets.phantomWallet) {
                      return window._gigaAuraWallets.phantomWallet;
                    }
                    
                    // Direct checks
                    if (window.phantom && window.phantom.solana) {
                      _phantomRef = window.phantom.solana;
                      window._gigaAuraWallets.phantomWallet = _phantomRef;
                      return _phantomRef;
                    }
                    
                    if (window.solana && window.solana.isPhantom) {
                      _phantomRef = window.solana;
                      window._gigaAuraWallets.phantomWallet = _phantomRef;
                      return _phantomRef;
                    }
                    
                    return null;
                  };
                  
                  // Function to block ethereum access
                  function lockDownEthereum() {
                    if (_didInit) return;
                    _didInit = true;
                    
                    // Method 1: Override Object.defineProperty
                    Object.defineProperty = function(obj, prop, descriptor) {
                      // Block any ethereum property changes on window
                      if (obj === window && prop === 'ethereum') {
                        console.warn('Blocked attempt to define ethereum property via Object.defineProperty');
                        return obj;
                      }
                      
                      // Otherwise proceed normally
                      return _originalDefineProperty.call(this, obj, prop, descriptor);
                    };
                    
                    // Method 2: Override Object.defineProperties
                    Object.defineProperties = function(obj, props) {
                      // If trying to define on window and contains ethereum, block that property
                      if (obj === window && props.ethereum) {
                        console.warn('Blocked attempt to define ethereum property via Object.defineProperties');
                        delete props.ethereum;
                      }
                      
                      // Otherwise proceed normally
                      return _originalDefineProperties.call(this, obj, props);
                    };
                    
                    // Method 3: Direct property override with getter/setter that can't be changed
                    try {
                      // If ethereum already has a descriptor, preserve its behavior
                      if (_originalDesc) {
                        Object.defineProperty(window, 'ethereum', {
                          configurable: false,
                          enumerable: true,
                          get: function() {
                            return _originalDesc.get ? _originalDesc.get.call(window) : _originalEthereum;
                          },
                          set: function() {
                            console.warn('Blocked attempt to set ethereum property');
                            return true; // Silent failure
                          }
                        });
                      } else {
                        // If no descriptor exists, make one that returns the value but blocks changes
                        Object.defineProperty(window, 'ethereum', {
                          configurable: false,
                          enumerable: true,
                          writable: false,
                          value: _originalEthereum
                        });
                      }
                    } catch(e) {
                      console.warn('Error locking down ethereum:', e);
                    }
                  }
                  
                  // Run immediately
                  capturePhantom();
                  lockDownEthereum();
                  
                  // Also run after a delay to catch late injections
                  setTimeout(capturePhantom, 500);
                })();
              `
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 