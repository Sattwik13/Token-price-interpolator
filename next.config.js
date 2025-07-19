/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['redis', 'mongodb', 'bullmq', 'alchemy-sdk']
  }
}

export default nextConfig