/** Default matches apps/server PORT (see config/env.ts). Override via BACKEND_URL in .env.local */
const DEFAULT_DEV_BACKEND_URL = 'http://localhost:3001'

/**
 * Production Railway (Express) — port 8080 en interne ; URL publique sans port.
 * @see https://sales-companion-20-production.up.railway.app
 */
export const RAILWAY_PRODUCTION_BACKEND_URL =
  'https://sales-companion-20-production.up.railway.app'

/**
 * Base URL for Express API proxies (team, support).
 * Next route handlers call `${getBackendUrl()}/api/...`; Express strips the `/api` prefix.
 */
export function getBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_DEV_BACKEND_URL
  )
}
