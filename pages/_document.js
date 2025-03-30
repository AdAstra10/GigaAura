import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Early wallet detection - must run before all other scripts */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // COMPLETE ISOLATION: No ethereum interactions whatsoever
                  
                  // Create a unique, non-conflicting namespace for our app
                  window.__GIGA_AURA_SECURE_NAMESPACE = window.__GIGA_AURA_SECURE_NAMESPACE || {};
                  
                  // Safe detection function that doesn't interact with other wallets
                  function safeDetectPhantom() {
                    var detected = null;
                    
                    try {
                      // Only look for Phantom/Solana to avoid all ethereum conflicts
                      if (window.phantom && window.phantom.solana) {
                        detected = window.phantom.solana;
                      } else if (window.solana && window.solana.isPhantom) {
                        detected = window.solana;
                      }
                      
                      // Store in our isolated namespace
                      if (detected) {
                        window.__GIGA_AURA_SECURE_NAMESPACE.phantomWallet = detected;
                      }
                    } catch(e) { /* Silent fail - no logs */ }
                    
                    return detected;
                  }
                  
                  // Safe getter that never conflicts with other extensions
                  window.__GIGA_AURA_SECURE_NAMESPACE.getPhantomWallet = function() {
                    // Return from our namespace if available
                    if (window.__GIGA_AURA_SECURE_NAMESPACE.phantomWallet) {
                      return window.__GIGA_AURA_SECURE_NAMESPACE.phantomWallet;
                    }
                    
                    // Otherwise try to detect it
                    return safeDetectPhantom();
                  };
                  
                  // Run detection immediately
                  safeDetectPhantom();
                  
                  // Run again after a delay
                  setTimeout(safeDetectPhantom, 200);
                  
                  // Connect methods to window with deliberately unique names
                  // that won't conflict with other extensions
                  window.gigaAuraGetPhantomWallet = window.__GIGA_AURA_SECURE_NAMESPACE.getPhantomWallet;
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