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
          {/* DO NOT attempt to handle wallet providers in _document - let them work natively */}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          {/* Add custom script to handle wallet conflicts */}
          <script dangerouslySetInnerHTML={{
            __html: `
              // Handle wallet provider conflicts
              (function() {
                try {
                  // Save any existing ethereum to restore if needed
                  const originalEthereum = window.ethereum;
                  
                  // Create a way to detect when wallet scripts try to overwrite ethereum
                  let phantomInjected = false;
                  let otherWalletsInjected = false;
                  
                  // Watch for ethereum property injection
                  Object.defineProperty(window, 'ethereum', {
                    configurable: true,
                    enumerable: true,
                    get: function() {
                      return originalEthereum;
                    },
                    set: function(newEthereum) {
                      // Let first ethereum injection happen normally
                      if (!originalEthereum && !phantomInjected && !otherWalletsInjected) {
                        Object.defineProperty(window, 'ethereum', {
                          value: newEthereum,
                          configurable: true,
                          writable: true,
                          enumerable: true
                        });
                        
                        // Track which wallet is setting ethereum
                        if (newEthereum && newEthereum.isPhantom) {
                          phantomInjected = true;
                        } else {
                          otherWalletsInjected = true;
                        }
                      }
                      // Log when conflicts happen but don't crash
                      else {
                        console.warn('Additional wallet tried to set window.ethereum - ignoring to prevent conflicts');
                      }
                    }
                  });
                } catch (e) {
                  console.error('Error setting up wallet detection:', e);
                }
              })();
            `
          }} />
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