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
          <meta name="apple-mobile-web-app-capable" content="yes" />
          
          {/* Add preconnect for better performance */}
          <link rel="preconnect" href="https://www.gigaaura.com" />
          <link rel="preconnect" href="https://gigaaura.onrender.com" />
          
          {/* Add script to handle wallet provider conflicts */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Prevent wallet provider conflicts
                (function() {
                  try {
                    // Store the original window.ethereum getter if it exists
                    const originalEthereumGetter = Object.getOwnPropertyDescriptor(window, 'ethereum');
                    
                    // Store original solana if it exists
                    const originalSolanaGetter = Object.getOwnPropertyDescriptor(window, 'solana');
                    
                    // Protect these properties from being overwritten or redefined
                    // This will allow first extension to set them but prevent conflicts
                    if (originalEthereumGetter) {
                      Object.defineProperty(window, 'ethereum', {
                        configurable: false,
                        ...originalEthereumGetter
                      });
                    }
                    
                    if (originalSolanaGetter) {
                      Object.defineProperty(window, 'solana', {
                        configurable: false,
                        ...originalSolanaGetter
                      });
                    }
                  } catch (e) {
                    console.warn('Error setting up wallet provider protection:', e);
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