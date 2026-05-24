/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow Google Fonts to be fetched at build/runtime
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
