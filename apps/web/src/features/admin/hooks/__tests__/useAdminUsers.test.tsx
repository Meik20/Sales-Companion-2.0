import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { useAdminUsers } from '../useAdminUsers'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('useAdminUsers', () => {
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

  it('should fetch users list successfully', async () => {
    const mockUsers = {
      items: [
        {
          uid: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'member',
          active: true,
        },
      ],
      total: 1,
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    })

    const { result } = renderHook(() => useAdminUsers(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.items).toHaveLength(1)
  })

  it('should return empty array on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    })

    const { result } = renderHook(() => useAdminUsers(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
