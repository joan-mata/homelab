import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',              value: 'DENY' },
        { key: 'X-Content-Type-Options',       value: 'nosniff' },
        { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security',    value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy',      value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:;" },
      ],
    },
  ],
};

export default nextConfig;
