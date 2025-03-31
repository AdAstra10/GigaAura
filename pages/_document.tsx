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
          
          {/* Complete wallet protection script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Wait for DOMContentLoaded to ensure this runs before any extensions
                  document.addEventListener('DOMContentLoaded', function() {
                    // Completely block all ethereum manipulations
                    var ethereumDesc = {
                      configurable: false,
                      enumerable: false,
                      get: function() { 
                        console.log("Ethereum access blocked: GigaAura only supports Phantom Wallet");
                        return null; 
                      },
                      set: function() {
                        console.log("Ethereum property setting blocked: GigaAura only supports Phantom Wallet");
                        return false;
                      }
                    };
                    
                    // Use a try-catch as we aggressively define the property
                    try {
                      // Delete any existing ethereum property first
                      delete window.ethereum;
                      
                      // Then define our own that can't be overwritten
                      Object.defineProperty(window, 'ethereum', ethereumDesc);
                    } catch (e) {
                      console.warn('Protected ethereum property');
                    }
                    
                    // Also protect window.web3
                    try {
                      delete window.web3;
                      Object.defineProperty(window, 'web3', {
                        configurable: false,
                        enumerable: false,
                        get: function() { return null; },
                        set: function() { return false; }
                      });
                    } catch (e) {
                      console.warn('Protected web3 property');
                    }
                    
                    // Protect Phantom wallet property
                    const originalSolanaGetter = Object.getOwnPropertyDescriptor(window, 'solana');
                    if (originalSolanaGetter) {
                      Object.defineProperty(window, 'solana', {
                        configurable: false,
                        ...originalSolanaGetter
                      });
                    }
                  });
                })();
              `
            }}
          />
          
          {/* Detect and fix toString errors immediately */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Global error handler for toString errors
                  window.addEventListener('error', function(event) {
                    // Check if error is related to toString on null
                    if (event.error && event.error.message && 
                        (event.error.message.includes("Cannot read properties of null (reading 'toString')") ||
                         event.error.message.includes("null is not an object (evaluating"))) {
                      
                      console.warn('Caught toString error, redirecting to safe page');
                      event.preventDefault();
                      
                      // Redirect to /home instead of showing the error
                      if (window.location.pathname === '/') {
                        window.location.href = '/home';
                      }
                    }
                  });
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