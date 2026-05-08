import type { MetadataRoute } from 'next'

/**
 * Dynamically generated /robots.txt via Next.js App Router.
 *
 * Strategy:
 *  - Allow public pages: /, /login, /register, /activate
 *  - Disallow all protected / admin routes (require auth)
 *  - Point crawlers to the sitemap
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sales-companion.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/register',
          '/activate',
        ],
        disallow: [
          '/pipeline',
          '/search',
          '/saved',
          '/profile',
          '/settings',
          '/support',
          '/ai',
          '/team',
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
