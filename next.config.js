/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Optimize images
  images: {
    domains: [],
  },
  // Add custom webpack config if needed
  webpack: (config, { dev, isServer }) => {
    // Add any custom webpack config here
    return config;
  },
}

module.exports = nextConfig
