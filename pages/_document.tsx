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
          {/* Phantom wallet detection script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Phantom wallet detection - SOLANA ONLY
                (function() {
                  // Check for Phantom wallet and notify when ready
                  const checkForPhantom = function() {
                    if (window.phantom?.solana) {
                      console.info('Phantom wallet detected (modern format)');
                      window.dispatchEvent(new CustomEvent('phantomReady'));
                      return true;
                    } else if (window.solana && window.solana.isPhantom) {
                      console.info('Phantom wallet detected (legacy format)');
                      window.dispatchEvent(new CustomEvent('phantomReady'));
                      return true;
                    }
                    return false;
                  };
                  
                  // Check as soon as possible
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', checkForPhantom);
                  } else {
                    checkForPhantom();
                  }
                  
                  // Also check periodically in case it loads late
                  const phantomCheckInterval = setInterval(function() {
                    if (checkForPhantom()) {
                      clearInterval(phantomCheckInterval);
                    }
                  }, 100);
                  
                  // Give up after 5 seconds
                  setTimeout(function() { 
                    clearInterval(phantomCheckInterval);
                  }, 5000);
                })();
              `,
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