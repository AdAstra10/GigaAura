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
          {/* Critical minimum script to manage toString errors */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Override toString to prevent null errors
                try {
                  const originalToString = Object.prototype.toString;
                  Object.prototype.toString = function() {
                    try {
                      if (this === null || this === undefined) {
                        return "[object SafeNull]";
                      }
                      return originalToString.call(this);
                    } catch(e) {
                      return "[object Protected]";
                    }
                  };
                  console.log("toString protection applied");
                } catch(e) {
                  console.warn("toString protection failed:", e);
                }
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
          
          {/* Block script injection from wallet extensions */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  // Intercept browser APIs that might be used by wallet extensions
                  const originalCreateElement = document.createElement;
                  
                  document.createElement = function(tagName) {
                    const element = originalCreateElement.call(document, tagName);
                    
                    // Watch for script tags
                    if (tagName.toLowerCase() === 'script') {
                      const originalSetAttribute = element.setAttribute;
                      
                      element.setAttribute = function(name, value) {
                        // Block problematic scripts by source
                        if (name === 'src' && typeof value === 'string' && (
                            value.includes('inpage.js') || 
                            value.includes('evmAsk.js') ||
                            value.includes('metamask') ||
                            value.includes('ethereum') ||
                            value.includes('web3modal') ||
                            value.includes('injected')
                          )) {
                          console.warn('GigaAura blocked problematic script:', value);
                          return element; // Return without setting the attribute
                        }
                        return originalSetAttribute.call(this, name, value);
                      };
                    }
                    
                    return element;
                  };
                  
                  // Global error handler for common wallet extension errors
                  window.addEventListener('error', function(e) {
                    if (e.error && e.error.message && (
                        e.error.message.includes('ethereum') ||
                        e.error.message.includes('web3') ||
                        e.error.message.includes('Cannot read properties of null')
                      )) {
                      console.warn('GigaAura caught wallet extension error:', e.error.message);
                      e.preventDefault();
                    }
                  }, true);
                } catch(err) {
                  console.warn('GigaAura script protection error:', err);
                }
              `
            }}
          />
          
          {/* Security headers */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;" />
          <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
          <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
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