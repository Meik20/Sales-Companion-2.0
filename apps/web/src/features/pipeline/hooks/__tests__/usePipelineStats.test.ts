import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePipelineStats } from '../../usePipelineStats'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('usePipelineStats', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('should fetch pipeline stats successfully', async () => {
    const mockStats = {
      total: 100,
      prospection: 60,
      negotiation: 25,
      conclusion: 10,
      lost: 5,
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    })

    const { result } = renderHook(() => usePipelineStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.total).toBe(100)
    expect(result.current.data?.conclusion).toBe(10)
  })

  it('should return default stats on error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    })

    const { result } = renderHook(() => usePipelineStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
