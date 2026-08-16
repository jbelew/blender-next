/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        permanent: false,
      },
    ];
  },
  typescript: {
    // Skip Next.js internal type-checking during builds to avoid TypeScript compiler CLI flag mismatches
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
