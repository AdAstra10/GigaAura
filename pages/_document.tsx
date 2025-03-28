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
                (function() {
                  // Store original descriptor if it exists
                  let originalEthereumDescriptor = null;
                  if (Object.getOwnPropertyDescriptor(window, 'ethereum')) {
                    originalEthereumDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
                  }
                  
                  // Create a safe ethereum getter that doesn't throw errors
                  const safeDescriptor = {
                    configurable: true,
                    get: function() {
                      try {
                        // Return original value if possible
                        if (originalEthereumDescriptor && originalEthereumDescriptor.get) {
                          return originalEthereumDescriptor.get.call(window);
                        }
                      } catch (e) {
                        console.warn('Error accessing ethereum provider:', e);
                      }
                      return undefined;
                    }
                  };
                  
                  // Only apply if needed
                  try {
                    if (originalEthereumDescriptor) {
                      // Don't override if descriptor is already safe
                      if (!originalEthereumDescriptor._safe) {
                        // Mark our descriptor so we know it's safe
                        safeDescriptor._safe = true;
                        Object.defineProperty(window, 'ethereum', safeDescriptor);
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to create safe ethereum environment:', e);
                  }
                })();
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