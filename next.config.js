/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Add security headers to help prevent script conflicts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          }
        ],
      },
    ]
  },
  
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
  },
};

module.exports = nextConfig; 