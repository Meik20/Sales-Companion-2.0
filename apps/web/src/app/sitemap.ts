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
    },
    // Villes
    {
      url: `${baseUrl}/annuaire/douala`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire/yaounde`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire/bafoussam`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/annuaire/garoua`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/annuaire/bamenda`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    // Secteurs
    {
      url: `${baseUrl}/annuaire/btp`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire/tech`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire/finance`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/annuaire/logistique`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/annuaire/agro`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/annuaire/commerce`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8
    }
  ]
}
