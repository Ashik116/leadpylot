import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production builds on low-memory servers
  productionBrowserSourceMaps: false, // Disable source maps to reduce memory usage

  // Use standalone output for smaller, optimized builds
  output: 'standalone',

  // Optimize compilation
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental features for better performance
  experimental: {
    // Reduce memory usage during build (webpack-based builds)
    webpackMemoryOptimizations: true,
    // Optimize package imports to eliminate barrel file performance penalty
    // Per Vercel best practices: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Turbopack: skip Jodit's bundled CSS (has invalid CSS, loaded from /public instead)
  turbopack: {
    resolveAlias: {
      'jodit/es2021/jodit.min.css': './src/assets/styles/jodit-noop.css',
    },
  },
  // Ensure external packages are handled correctly
  serverExternalPackages: ['@react-pdf/renderer', '@react-pdf/reconciler'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  webpack(config) {
    config.resolve.alias['jodit/es2021/jodit.min.css'] = path.resolve(
      __dirname,
      'src/assets/styles/jodit-noop.css'
    );
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/login-security/:path*',
        destination: 'http://localhost:3000/login-security/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3000/auth/:path*',
      },
      {
        source: '/leads/:path*',
        destination: 'http://localhost:3000/leads/:path*',
      },
      {
        source: '/projects/:path*',
        destination: 'http://localhost:3000/projects/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://localhost:3000/users/:path*',
      },
      {
        source: '/settings/:path*',
        destination: 'http://localhost:3000/settings/:path*',
      },
      // Add other API routes as needed
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
