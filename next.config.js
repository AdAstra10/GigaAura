/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
    unoptimized: true,
  },
  // Handle custom domain
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.gigaaura.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.gigaaura.com https://i.pravatar.cc https://picsum.photos https://images.unsplash.com;"
          }
        ],
      },
    ]
  },
};

module.exports = nextConfig; 