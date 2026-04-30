import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeleteAdminUser } from '../useDeleteAdminUser'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('useDeleteAdminUser', () => {
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

  it('should delete user successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    const { result } = renderHook(() => useDeleteAdminUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('user-123')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should handle delete errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Delete failed' }),
    })

    const { result } = renderHook(() => useDeleteAdminUser(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync('user-123')
      } catch (error) {
        // Expected error
      }
    })

    expect(result.current.isError).toBe(true)
  })
})
