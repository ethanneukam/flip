/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true, // <--- ADD THIS LINE
  images: {
    unoptimized: true,
    domains: [
      "lh3.googleusercontent.com",
      "images.unsplash.com"
    ],
  },
};

module.exports = nextConfig;
