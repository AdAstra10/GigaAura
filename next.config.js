/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com', 'i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'],
    unoptimized: true,
  },
};

module.exports = nextConfig; 