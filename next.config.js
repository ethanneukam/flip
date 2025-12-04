/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,

  // OPTIONAL — keep if you want it
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "images.unsplash.com"
    ],
  },

  // OPTIONAL for future server actions
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
