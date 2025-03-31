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
          {/* Safe toString for null values - this is essential to prevent the toString error */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Safe toString implementation to prevent null reference errors
                try {
                  if (Object.prototype.toString) {
                    const originalToString = Object.prototype.toString;
                    Object.prototype.toString = function() {
                      try {
                        // Only handle null/undefined cases
                        if (this === null || this === undefined) {
                          return "[object SafeNull]";
                        }
                        return originalToString.call(this);
                      } catch(e) {
                        return "[object Protected]";
                      }
                    };
                    console.log("toString protection enabled");
                  }
                } catch(e) {
                  console.warn("Error applying toString protection:", e);
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