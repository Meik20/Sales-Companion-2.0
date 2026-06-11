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
        allow: ['/', '/login', '/register'],
        disallow: ['/api/', '/_next/', '/admin/', '/protected/']
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
