/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // KEEP THIS COMMENTED OUT FIRST
  trailingSlash: true, 
  images: {
    unoptimized: true,
    domains: [
      "lh3.googleusercontent.com",
      "images.unsplash.com"
    ],
  },
};

module.exports = nextConfig;
