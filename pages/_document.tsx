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
          {/* Add meta tags for better mobile handling */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="theme-color" content="#6366F1" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          
          {/* Add preconnect for better performance */}
          <link rel="preconnect" href="https://www.gigaaura.com" />
          <link rel="preconnect" href="https://gigaaura.onrender.com" />
          
          {/* Add Content Security Policy for better security */}
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
          />
          
          {/* Add script to completely block ethereum property access and handle Phantom wallet only */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Block ethereum property and focus on Phantom wallet only
                (function() {
                  try {
                    // Prevent any access to ethereum property by creating a null getter
                    // This prevents conflicts with Chrome extensions like MetaMask
                    if (!Object.getOwnPropertyDescriptor(window, 'ethereum')) {
                      Object.defineProperty(window, 'ethereum', {
                        configurable: false,
                        enumerable: false,
                        get: function() { return null; }
                      });
                    }
                    
                    // Store original solana if it exists
                    const originalSolanaGetter = Object.getOwnPropertyDescriptor(window, 'solana');
                    
                    // Protect this property from being overwritten or redefined
                    // This will allow Phantom to set it but prevent conflicts
                    if (originalSolanaGetter) {
                      Object.defineProperty(window, 'solana', {
                        configurable: false,
                        ...originalSolanaGetter
                      });
                    }
                  } catch (e) {
                    console.warn('Error setting up wallet protection:', e);
                  }
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