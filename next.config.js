/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
    unoptimized: true,
  },
  // Optimize for production build
  productionBrowserSourceMaps: false,
  
  // Configure webpack to handle PostgreSQL module on the client side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'pg', 'fs', 'net', 'tls', or 'dns' modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  
  // Handle custom domain and security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.gigaaura.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://*.gigaaura.com https://*.onrender.com https://cloudflareinsights.com https://*.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebase.googleapis.com https://*.gstatic.com; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ]
  },
  // Force redirect from / to /home
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: false,
      },
    ]
  },
  // Optimize loading performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Minimize the impact of runtime JavaScript
  poweredByHeader: false,
};

module.exports = nextConfig; 