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
          {/* HIGHEST PRIORITY script to block ethereum BEFORE anything else */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // IMMEDIATELY disable ethereum and web3 properties
                (function() {
                  try {
                    // Create null prototypes to prevent access to ethereum
                    Object.defineProperty(Window.prototype, 'ethereum', {
                      value: null,
                      writable: false,
                      configurable: false,
                      enumerable: false
                    });
                    
                    // Protect web3 as well
                    Object.defineProperty(Window.prototype, 'web3', {
                      value: null,
                      writable: false,
                      configurable: false,
                      enumerable: false
                    });
                    
                    console.log("Ethereum access successfully blocked at prototype level");
                  } catch(e) {
                    console.warn("Pre-protection failed, will try again later:", e);
                  }
                })();
              `
            }}
          />
          
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
                // Second layer protection for ethereum
                (function() {
                  // Run immediately 
                  try {
                    // Try again to define at window level in case prototype-level failed
                    Object.defineProperty(window, 'ethereum', {
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
                    });
                    
                    // Also block web3
                    Object.defineProperty(window, 'web3', {
                      configurable: false,
                      enumerable: false,
                      value: null,
                      writable: false
                    });
                  } catch (e) {
                    console.warn('Window-level protection failed:', e);
                  }
                  
                  // Wait for DOMContentLoaded for final layer of protection
                  document.addEventListener('DOMContentLoaded', function() {
                    try {
                      // Final attempt at key points
                      if (!Object.getOwnPropertyDescriptor(window, 'ethereum') || 
                          Object.getOwnPropertyDescriptor(window, 'ethereum').configurable) {
                        Object.defineProperty(window, 'ethereum', {
                          configurable: false,
                          enumerable: false,
                          value: null,
                          writable: false
                        });
                      }
                    } catch(e) {
                      console.warn("Final ethereum protection failed:", e);
                    }
                    
                    // Protect Phantom wallet property
                    try {
                      const originalSolanaGetter = Object.getOwnPropertyDescriptor(window, 'solana');
                      if (originalSolanaGetter) {
                        Object.defineProperty(window, 'solana', {
                          configurable: false,
                          ...originalSolanaGetter
                        });
                      }
                    } catch(e) {
                      console.warn("Solana protection failed:", e);
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
          
          {/* Block specific problematic script files by name */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Block specific problematic scripts
                (function() {
                  // Create a proxy for document.createElement
                  const originalCreateElement = document.createElement;
                  
                  document.createElement = function(tagName) {
                    const element = originalCreateElement.call(document, tagName);
                    
                    // If creating a script tag, watch for problematic scripts
                    if (tagName.toLowerCase() === 'script') {
                      const originalSetAttribute = element.setAttribute;
                      
                      element.setAttribute = function(name, value) {
                        // Check if it's a source attribute for problematic scripts
                        if (name === 'src' && (
                            value.includes('inpage.js') || 
                            value.includes('evmAsk.js') ||
                            value.includes('metamask') ||
                            value.includes('ethereum'))) {
                          console.warn('Blocked problematic script:', value);
                          return;
                        }
                        return originalSetAttribute.call(this, name, value);
                      };
                    }
                    
                    return element;
                  };
                })();
              `
            }}
          />
          
          {/* Add Content Security Policy to block problematic scripts */}
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' chrome-extension: https://fonts.googleapis.com; connect-src 'self' https://*.gigaaura.com https://*.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com chrome-extension:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;"
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