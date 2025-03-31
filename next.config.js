/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
    unoptimized: true,
  },
  // Optimize for production build
  productionBrowserSourceMaps: false,
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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' chrome-extension:; connect-src 'self' https://*.gigaaura.com https://*.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com chrome-extension:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;",
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
};

module.exports = nextConfig; 