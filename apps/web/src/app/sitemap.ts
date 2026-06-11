import type { MetadataRoute } from 'next'

/**
 * Dynamically generated /sitemap.xml via Next.js App Router.
 *
 * Only lists publicly indexable pages.
 * Protected pages (behind auth) are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    }
  ]
}
