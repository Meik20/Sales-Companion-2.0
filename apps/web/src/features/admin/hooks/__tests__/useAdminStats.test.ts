import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStats } from '../useAdminStats'

// Mock des modules
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

vi.mock('fetch', () => ({
  default: vi.fn(),
}))

describe('useAdminStats', () => {
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

  it('should not fetch when user is not authenticated', () => {
    vi.unmock('@/hooks/useCurrentUser')
    vi.doMock('@/hooks/useCurrentUser', () => ({
      useCurrentUser: () => ({
        user: null,
      }),
    }))

    const { result } = renderHook(() => useAdminStats(), { wrapper })

    expect(result.current.isLoading).toBe(false)
  })
})
