import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sales-companion.app'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: '../../',
  },

  // Allow dev access from local network
  allowedDevOrigins: ['192.168.1.139', 'localhost', '127.0.0.1'],

  async headers() {
    return [
      // ── Global security headers ──────────────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Anti-clickjacking
          { key: 'X-Frame-Options',               value: 'DENY' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options',         value: 'nosniff' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection',               value: '1; mode=block' },
          // Restrict referrer leakage
          { key: 'Referrer-Policy',                value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          // Block all search indexing & archiving
          { key: 'X-Robots-Tag',                   value: 'noindex, nofollow, nosnippet, noarchive, noimageindex' },
          // Prevent cross-origin embedding of resources
          { key: 'Cross-Origin-Resource-Policy',   value: 'same-origin' },
          // Isolate browsing context (prevent cross-origin reads)
          { key: 'Cross-Origin-Opener-Policy',     value: 'same-origin' },
          // Prevent cross-origin embedding of this page
          { key: 'Cross-Origin-Embedder-Policy',   value: 'require-corp' },
          // Content-Security-Policy: restrict sources to self + Firebase
          {
            key: 'Content-Security-Policy',
            value: [
              `default-src 'self'`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://maps.googleapis.com`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
              `font-src 'self' https://fonts.gstatic.com`,
              `img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com`,
              `connect-src 'self' ${APP_URL} https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com`,
              `frame-src 'none'`,
              `object-src 'none'`,
              `base-uri 'self'`,
              `form-action 'self'`,
              `upgrade-insecure-requests`,
            ].join('; '),
          },
        ],
      },

      // ── API routes: add cache-control to prevent caching of sensitive data ─
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control',  value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma',         value: 'no-cache' },
          { key: 'X-Robots-Tag',  value: 'noindex, nofollow' },
        ],
      },

      // ── PWA assets (public, cacheable) ───────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type',  value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/favicon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
    ]
  },
}

export default nextConfig
