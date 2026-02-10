/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ADD THIS BLOCK BELOW:
  typescript: {
    // This allows production builds to successfully complete 
    // even if your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // If you have eslint errors too, add this:
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
