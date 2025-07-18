/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['redis', 'mongodb', 'bullmq', 'alchemy-sdk']
  }
}

export default nextConfig