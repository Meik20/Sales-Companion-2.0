import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { useAdminStats } from '../useAdminStats'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token')
    }
  })
}))

describe('useAdminStats', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('should fetch admin stats successfully', async () => {
    const mockStats = {
      totalUsers: 100,
      totalCompanies: 500,
      totalPipelineItems: 1000,
      activeUsers: 50,
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    })

    const { result } = renderHook(() => useAdminStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockStats)
  })

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useAdminStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

})
