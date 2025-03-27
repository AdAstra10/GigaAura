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
          {/* Add meta to help prevent wallet extension conflicts */}
          <meta name="eth-extension-conflict" content="prevent" />
          {/* Load wallet detection script before any other scripts */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Prevent conflicts between different wallet extensions
                if (window.ethereum) {
                  // Mark existing ethereum provider to prevent overrides
                  Object.defineProperty(window.ethereum, '_isCustomProvider', {
                    value: true,
                    writable: false,
                    configurable: false
                  });
                }
              `,
            }}
          />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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