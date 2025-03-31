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
          {/* Compatibility script for Solana dApps - preserves window.solana for Phantom */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Solana-focused script that preserves Phantom while blocking other wallets
                try {
                  // Only modify ethereum property if it doesn't exist yet
                  if (!window.hasOwnProperty('ethereum')) {
                    // Create a dummy ethereum property that doesn't interfere with Phantom
                    Object.defineProperty(window, 'ethereum', {
                      value: null,
                      writable: true,
                      configurable: true
                    });
                    console.log("Added placeholder ethereum property");
                  }
                  
                  // Only modify web3 property if it doesn't exist yet
                  if (!window.hasOwnProperty('web3')) {
                    // Create a dummy web3 property
                    Object.defineProperty(window, 'web3', {
                      value: null,
                      writable: true,
                      configurable: true
                    });
                    console.log("Added placeholder web3 property");
                  }
                  
                  // Safe toString implementation to prevent null reference errors
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
                  
                  console.log("Solana compatibility layer active");
                } catch(e) {
                  console.warn("Compatibility layer error:", e);
                }
              `
            }}
          />
          
          <meta charSet="utf-8" />
          <meta name="description" content="GigaAura - Social media platform with Solana wallet integration" />
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
          
          {/* Security headers properly formatted */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://*.solana.com https://*.gigaaura.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;" />
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