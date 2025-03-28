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
                // Create a safe environment for wallet providers by wrapping everything in a try-catch
                try {
                  // Create a global flag to track if we've already handled providers
                  window._walletHandled = window._walletHandled || false;
                  
                  // Only run this code once
                  if (!window._walletHandled) {
                    // Store original properties without accessing getters 
                    // to avoid triggering any existing errors
                    const originalDescriptors = {};
                    
                    // Function to safely get property descriptor
                    const safeGetDescriptor = (obj, prop) => {
                      try {
                        return Object.getOwnPropertyDescriptor(obj, prop);
                      } catch (e) {
                        return null;
                      }
                    };
                    
                    // Save original descriptor for ethereum if it exists
                    const ethereumDesc = safeGetDescriptor(window, 'ethereum');
                    if (ethereumDesc) {
                      originalDescriptors.ethereum = ethereumDesc;
                    }
                    
                    // Save original descriptor for solana if it exists
                    const solanaDesc = safeGetDescriptor(window, 'solana');
                    if (solanaDesc) {
                      originalDescriptors.solana = solanaDesc;
                    }
                    
                    // Use a flag to prevent multiple attempts at redefining
                    window._walletHandled = true;
                    
                    // Create an initialization function to be called after scripts have loaded
                    window._initializeWalletSafely = function() {
                      // Check if we need to restore descriptors
                      if (originalDescriptors.ethereum) {
                        try {
                          // Only define if it doesn't exist or was deleted
                          if (!safeGetDescriptor(window, 'ethereum')) {
                            Object.defineProperty(window, 'ethereum', originalDescriptors.ethereum);
                          }
                        } catch (e) {
                          console.warn('Could not restore ethereum property', e);
                        }
                      }
                      
                      if (originalDescriptors.solana) {
                        try {
                          // Only define if it doesn't exist or was deleted
                          if (!safeGetDescriptor(window, 'solana')) {
                            Object.defineProperty(window, 'solana', originalDescriptors.solana);
                          }
                        } catch (e) {
                          console.warn('Could not restore solana property', e);
                        }
                      }
                    };
                    
                    // Set a timeout to initialize after other scripts
                    setTimeout(function() {
                      if (window._initializeWalletSafely) {
                        window._initializeWalletSafely();
                      }
                    }, 500);
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