/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // <--- CRITICAL FOR MOBILE WRAP
  images: {
    unoptimized: true, // <--- Required for 'export' mode
    domains: [
      "lh3.googleusercontent.com",
      "images.unsplash.com"
    ],
  },
  // Note: Server Actions don't work in 'export' mode. 
  // If you need them, we stick to PWA, but for Capacitor/Native, use API routes.
};

module.exports = nextConfig;
