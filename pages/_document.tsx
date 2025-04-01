import { Html, Head, Main, NextScript } from 'next/document';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Document, { DocumentContext, DocumentInitialProps } from 'next/document';

// Create a custom Document class for better CSP support
class MyDocument extends Document {
  // Generate a random nonce for each request
  nonce = crypto.randomBytes(16).toString('base64');
  
  // Get ethereum shim content
  ethereumShimContent = '';
  
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }
  
  constructor(props: any) {
    super(props);
    // Try to read the ethereum-shim.js file
    try {
      if (typeof process !== 'undefined') {
        const shimPath = path.join(process.cwd(), 'public', 'ethereum-shim.js');
        if (fs.existsSync(shimPath)) {
          this.ethereumShimContent = fs.readFileSync(shimPath, 'utf8');
        }
      }
    } catch (error) {
      console.error('Error reading ethereum-shim.js:', error);
    }
  }
  
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Apply CSP using the nonce */}
          <meta
            httpEquiv="Content-Security-Policy"
            content={`default-src 'self'; 
                      script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${this.nonce}'; 
                      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
                      font-src 'self' https://fonts.gstatic.com; 
                      img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com; 
                      connect-src 'self' https://*.gigaaura.com https://*.onrender.com;
                      worker-src 'self' blob:;
                      child-src 'self' blob:;
                      object-src 'none';
                      base-uri 'self';
                      form-action 'self';`}
          />
          
          {/* CRITICAL: Load the ethereum protection as inline script to execute first */}
          <script 
            id="ethereum-protector" 
            dangerouslySetInnerHTML={{ __html: this.ethereumShimContent }} 
            nonce={this.nonce}
            data-priority="true"
          />
          
          {/* META: Allow Phantom wallet but block other wallet extensions */}
          <meta name="ethereum" content="false" />
          <meta name="web3" content="false" />
          <meta name="metamask" content="false" />
          <meta name="crypto" content="Phantom" />
          
          {/* Basic meta tags */}
          <meta charSet="utf-8" />
          <meta name="description" content="GigaAura - Social media platform with crypto wallet integration" />
          <link rel="icon" href="/favicon.ico" />
          
          {/* Fonts */}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          
          {/* Mobile tags */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="theme-color" content="#1D9BF0" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          
          {/* Performance optimizations */}
          <link rel="preconnect" href="https://www.gigaaura.com" />
          <link rel="preconnect" href="https://gigaaura.onrender.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* Security headers */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
          <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
          <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
          <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), interest-cohort=()" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={this.nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 