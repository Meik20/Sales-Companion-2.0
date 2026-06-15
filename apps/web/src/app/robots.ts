import type { MetadataRoute } from 'next'

/**
 * /robots.txt — Bloque tous les crawlers et archiveurs.
 * La plateforme contient des données commerciales propriétaires
 * qui ne doivent pas être indexées ni archivées.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'

  return {
    rules: [
      {
        userAgent: '*',
        // ── Pages publiques indexables ────────────────────────────────
        allow: [
          '/',
          '/login',
          '/register',
          '/blog',
          '/blog/',
          '/annuaire',
          '/annuaire/',
          '/terms',
          '/privacy'
        ],
        // ── Routes à ne pas indexer ───────────────────────────────────
        // Note : le groupe de route (protected) est transparent dans l'URL.
        // Les vraies URLs des pages protégées sont listées explicitement.
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/settings',
          '/pipeline',
          '/search',
          '/profile',
          '/saved',
          '/ai',
          '/support',
          '/upgrade',
          '/activate'
        ]
      },
      // Block AI scrapers from all content to protect proprietary database
      { userAgent: 'GPTBot', disallow: ['/'] },
      { userAgent: 'CCBot', disallow: ['/'] },
      { userAgent: 'ChatGPT-User', disallow: ['/'] },
      { userAgent: 'Google-Extended', disallow: ['/'] },
      { userAgent: 'anthropic-ai', disallow: ['/'] },
      { userAgent: 'ClaudeBot', disallow: ['/'] },
      { userAgent: 'Bytespider', disallow: ['/'] },
      { userAgent: 'AhrefsBot', disallow: ['/api/', '/admin/', '/protected/', '/_next/'] },
      { userAgent: 'SemrushBot', disallow: ['/api/', '/admin/', '/protected/', '/_next/'] }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  }
}
