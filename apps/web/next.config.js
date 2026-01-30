/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@faceroyale/face-tracking', '@faceroyale/game-core'],
  images: {
    domains: ['storage.googleapis.com', 'cdn.jsdelivr.net'],
  },
};

module.exports = nextConfig;
