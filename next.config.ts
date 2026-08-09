import { NextConfig } from 'next';
import packageJson from './package.json';

const buildVersion = process.env.APP_VERSION || packageJson.version;
const buildCommit = process.env.APP_COMMIT || process.env.GITHUB_SHA || 'unknown';
const builtAt = process.env.APP_BUILT_AT || new Date().toISOString();
const deploymentEnvironment = process.env.APP_ENVIRONMENT || 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimized production build with minimal dependencies
  // Embed only non-secret provenance in the artifact. This prevents a failed
  // deployment from advertising a SHA that never reached the running app.
  env: {
    OMNIPOST_VERSION: buildVersion,
    OMNIPOST_COMMIT: buildCommit,
    OMNIPOST_BUILT_AT: builtAt,
    OMNIPOST_ENVIRONMENT: deploymentEnvironment,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api-inference.huggingface.co https://api.openai.com https://api.deepseek.com https://*.openai.azure.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
