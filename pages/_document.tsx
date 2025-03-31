import { Html, Head, Main, NextScript } from 'next/document';
import fs from 'fs';
import path from 'path';

export default function Document() {
  // Read the ethereum-shim.js content 
  let ethereumShimContent = '';
  try {
    // In build/production, we can read the file directly
    if (process.env.NODE_ENV === 'production') {
      const shimPath = path.join(process.cwd(), 'public', 'ethereum-shim.js');
      ethereumShimContent = fs.existsSync(shimPath) ? fs.readFileSync(shimPath, 'utf8') : '';
    }
  } catch (error) {
    console.error('Error reading ethereum-shim.js:', error);
  }

  return (
    <Html lang="en">
      <Head>
        {/* Load ethereum protection script the safe way */}
        {ethereumShimContent ? (
          <script dangerouslySetInnerHTML={{ __html: ethereumShimContent }} />
        ) : (
          <script src="/ethereum-shim.js" />
        )}
        
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
        
        {/* Security headers */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;" />
        <meta name="X-Frame-Options" content="SAMEORIGIN" />
        <meta name="X-Content-Type-Options" content="nosniff" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 