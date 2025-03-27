/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cloudinary.com', 's3.amazonaws.com'],
  },
};

module.exports = nextConfig; 