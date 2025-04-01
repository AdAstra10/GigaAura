import { Html, Head, Main, NextScript } from 'next/document';
import fs from 'fs';
import path from 'path';

export default function Document() {
  // Read the ethereum-shim.js content 
  let ethereumShimContent = '';
  try {
    // Always try to read the file content
    const shimPath = path.join(process.cwd(), 'public', 'ethereum-shim.js');
    ethereumShimContent = fs.existsSync(shimPath) ? fs.readFileSync(shimPath, 'utf8') : '';
  } catch (error) {
    console.error('Error reading ethereum-shim.js:', error);
  }

  return (
    <Html lang="en">
      <Head>
        {/* SUPER CRITICAL: This script MUST load first, before ANY other scripts */}
        <script 
          id="ethereum-protector" 
          dangerouslySetInnerHTML={{ __html: ethereumShimContent }} 
          data-priority="true"
        />
        
        {/* Meta tags to aggressively prevent wallet detection */}
        <meta name="ethereum" content="false" />
        <meta name="web3" content="false" />
        <meta name="metamask" content="false" />
        <meta name="crypto" content="Phantom" />
        
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
        
        {/* Security headers - FIXED CSP to allow eval */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta 
          httpEquiv="Content-Security-Policy" 
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com; connect-src 'self' https://*.gigaaura.com;" 
        />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 