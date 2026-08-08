/** Default matches dev server PORT. Override via BACKEND_URL or NEXT_PUBLIC_API_URL */
const DEFAULT_DEV_BACKEND_URL = 'http://localhost:3000'

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
