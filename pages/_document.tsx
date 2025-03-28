import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="description" content="GigaAura - Social media platform with crypto wallet integration" />
          <link rel="icon" href="/favicon.ico" />
          {/* Add meta to help prevent wallet extension conflicts */}
          <meta name="wallet-conflict-strategy" content="passive" />
          {/* Load wallet detection script before any other scripts */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Create a safe environment for wallet providers
                try {
                  // Store the original values temporarily
                  const originalEthereum = window.ethereum;
                  const originalSolana = window.solana;
                  
                  // Create safe getters and setters
                  let ethereumValue = originalEthereum;
                  let solanaValue = originalSolana;
                  
                  // Only define once to prevent conflicts
                  if (!window._walletProvidersHandled) {
                    // Define ethereum property with controlled getter and setter
                    Object.defineProperty(window, 'ethereum', {
                      configurable: true,
                      get: function() {
                        return ethereumValue;
                      },
                      set: function(val) {
                        // Allow setting only if not already set or if we know it's safe
                        if (!ethereumValue || val._isAuraWalletProvider) {
                          ethereumValue = val;
                        }
                      }
                    });
                    
                    // Define solana property with controlled getter and setter
                    Object.defineProperty(window, 'solana', {
                      configurable: true,
                      get: function() {
                        return solanaValue;
                      },
                      set: function(val) {
                        // Allow setting only if not already set or if we know it's safe
                        if (!solanaValue || val._isAuraWalletProvider) {
                          solanaValue = val;
                        }
                      }
                    });
                    
                    // Mark as handled
                    window._walletProvidersHandled = true;
                  }
                } catch (e) {
                  console.warn('Failed to set up safe wallet environment', e);
                }
              `,
            }}
          />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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