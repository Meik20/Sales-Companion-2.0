import type { MetadataRoute } from 'next'

/**
 * /robots.txt — Bloque tous les crawlers et archiveurs.
 * La plateforme contient des données commerciales propriétaires
 * qui ne doivent pas être indexées ni archivées.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Block all bots from everything
        userAgent: '*',
        disallow: ['/'],
      },
      // Explicitly block major scrapers even if they ignore '*'
      { userAgent: 'GPTBot',          disallow: ['/'] },
      { userAgent: 'CCBot',           disallow: ['/'] },
      { userAgent: 'ChatGPT-User',    disallow: ['/'] },
      { userAgent: 'Google-Extended', disallow: ['/'] },
      { userAgent: 'anthropic-ai',    disallow: ['/'] },
      { userAgent: 'ClaudeBot',       disallow: ['/'] },
      { userAgent: 'Bytespider',      disallow: ['/'] },
      { userAgent: 'Applebot',        disallow: ['/'] },
      { userAgent: 'AhrefsBot',       disallow: ['/'] },
      { userAgent: 'SemrushBot',      disallow: ['/'] },
      { userAgent: 'MJ12bot',         disallow: ['/'] },
      { userAgent: 'DotBot',          disallow: ['/'] },
      { userAgent: 'DataForSeoBot',   disallow: ['/'] },
      { userAgent: 'ia_archiver',     disallow: ['/'] },
    ],
    // No sitemap exposed to public indexers
  }
}
