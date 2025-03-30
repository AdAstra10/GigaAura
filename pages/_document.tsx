import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <body>
          <Main />
          <NextScript />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Add Phantom wallet detection
                if (typeof window !== 'undefined') {
                  window.addEventListener('load', function() {
                    // Check if the phantom wallet extension is installed
                    const isPhantomInstalled = window.phantom?.solana || window.solana?.isPhantom;
                    
                    if (!isPhantomInstalled) {
                      console.log('Phantom wallet is not installed');
                    }
                  });
                }
              `,
            }}
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 