import { QueryClient } from '@tanstack/react-query'

/** QueryClient for tests — no retries (avoids flaky isError assertions). */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}
