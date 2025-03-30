import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Early isolation script to prevent ethereum conflicts */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Create a safe, isolated environment for wallet detection
                  window._gigaAuraWallets = {};
                  
                  // Store original descriptor if ethereum exists
                  var ethereumDesc = Object.getOwnPropertyDescriptor(window, 'ethereum');
                  
                  // Watch for Phantom wallet without touching ethereum
                  if (window.phantom && window.phantom.solana) {
                    window._gigaAuraWallets.phantomWallet = window.phantom.solana;
                  } else if (window.solana && window.solana.isPhantom) {
                    window._gigaAuraWallets.phantomWallet = window.solana;
                  }
                  
                  // Create safe getter that avoids conflicts
                  window.getPhantomWallet = function() {
                    // Try direct reference first
                    if (window._gigaAuraWallets.phantomWallet) {
                      return window._gigaAuraWallets.phantomWallet;
                    }
                    
                    // Fallback detection
                    if (window.phantom && window.phantom.solana) {
                      window._gigaAuraWallets.phantomWallet = window.phantom.solana;
                      return window._gigaAuraWallets.phantomWallet;
                    }
                    
                    if (window.solana && window.solana.isPhantom) {
                      window._gigaAuraWallets.phantomWallet = window.solana;
                      return window._gigaAuraWallets.phantomWallet;
                    }
                    
                    return null;
                  };
                  
                  // Block attempts to modify ethereum globally - creates a no-op function 
                  // that prevents crashes but doesn't actually change ethereum
                  var originalDefineProperty = Object.defineProperty;
                  
                  Object.defineProperty = function(obj, prop, descriptor) {
                    // If trying to define ethereum on window, create a safe fallback
                    if (obj === window && prop === 'ethereum') {
                      console.warn('Prevented attempt to redefine ethereum property');
                      return obj;
                    }
                    
                    // Otherwise proceed normally
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  };
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