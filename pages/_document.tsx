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
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* Add script to handle wallet provider conflicts */}
          <script dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                // Prevent ethereum property conflicts between wallet providers
                if (window.ethereum) {
                  try {
                    // Save original ethereum object
                    const originalEthereum = window.ethereum;
                    
                    // Create a non-writable property
                    Object.defineProperty(window, 'ethereum', {
                      value: originalEthereum,
                      writable: false,
                      configurable: true
                    });
                  } catch (err) {
                    console.warn('Error setting up ethereum property:', err);
                  }
                }
              });
            `
          }} />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 