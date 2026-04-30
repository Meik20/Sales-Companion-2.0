import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateAdminUser } from '../useUpdateAdminUser'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('useUpdateAdminUser', () => {
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

  it('should update user successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uid: 'user-123', active: false }),
    })

    const { result } = renderHook(() => useUpdateAdminUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        uid: 'user-123',
        data: { active: false },
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should handle update errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request' }),
    })

    const { result } = renderHook(() => useUpdateAdminUser(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          uid: 'user-123',
          data: { active: false },
        })
      } catch (error) {
        // Expected error
      }
    })

    expect(result.current.isError).toBe(true)
  })
})
