import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Special isolation script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // =============== PHANTOM WALLET ISOLATION ====================
                  // Create isolated storage for wallet references
                  window._phantomWalletRef = null;
                  window._gigaAuraWallets = {};
                  
                  // Track Phantom wallet early
                  function storePhantomWallet() {
                    try {
                      if (window.phantom && window.phantom.solana) {
                        window._phantomWalletRef = window.phantom.solana;
                      } else if (window.solana && window.solana.isPhantom) {
                        window._phantomWalletRef = window.solana;
                      }
                    } catch(e) {
                      console.warn("Error accessing phantom wallet");
                    }
                  }
                  
                  // Create a function to get phantom wallet
                  window.getPhantomWallet = function() {
                    // Use stored reference if available
                    if (window._phantomWalletRef) return window._phantomWalletRef;
                    
                    // Try to get it directly
                    storePhantomWallet();
                    return window._phantomWalletRef;
                  };
                  
                  // Run early
                  storePhantomWallet();
                  
                  // =============== ETHEREUM CONFLICT MITIGATION ================
                  // We're not trying to override ethereum anymore. Instead, 
                  // we'll focus on making our app work without interfering with it.
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