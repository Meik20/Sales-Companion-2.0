import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: '../../'
  },

  serverExternalPackages: ['firebase-admin'],

  // Allow dev access from local network
  allowedDevOrigins: ['192.168.1.139', 'localhost', '127.0.0.1'],

  async headers() {
    return [
      // ── Global security headers ──────────────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Anti-clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Restrict referrer leakage
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          // Autoriser l'indexation SEO par défaut (surchargé par route ci-dessous)
          // { key: 'X-Robots-Tag', value: 'noindex' }, // <-- Supprimé volontairement
          // Prevent cross-origin embedding of resources
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Isolate browsing context (prevent cross-origin reads)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Cross-Origin-Embedder-Policy removed globally — overridden per route
          // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' }, // ← bloquait Googlebot
          // Content-Security-Policy: restrict sources to self + Firebase
          {
            key: 'Content-Security-Policy',
            value: [
              `default-src 'self'`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://apis.google.com`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
              `font-src 'self' https://fonts.gstatic.com`,
              `img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://api.qrserver.com https://www.google-analytics.com https://www.googletagmanager.com`,
              `connect-src 'self' ${APP_URL} https://sales-companion.app https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com`,
              `frame-src 'self' https://*.firebaseapp.com`,
              `object-src 'none'`,
              `base-uri 'self'`,
              `form-action 'self'`,
              `upgrade-insecure-requests`
            ].join('; ')
          }
        ]
      },

      // ── API routes: add cache-control to prevent caching of sensitive data ─
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ]
      },

      // ── PWA assets (public, cacheable) ───────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' }
        ]
      },
      {
        source: '/favicon.svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }]
      },

      // ── Sitemap & robots.txt : accès libre pour les crawlers SEO ───────
      {
        source: '/(sitemap\.xml|robots\.txt)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' }
        ]
      },

      // ── Pages publiques indexées (landing, annuaire) ─────────────────
      {
        source: '/(|annuaire|annuaire/.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' }
        ]
      },

      // ── Routes protégées : pas d'indexation ────────────────────────
      {
        source: '/(protected|admin)/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ]
      }
    ]
  }
}

export default nextConfig
