import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeleteSavedSearch } from '../useDeleteSavedSearch'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token')
    }
  })
}))

describe('useDeleteSavedSearch', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should delete saved search successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    const { result } = renderHook(() => useDeleteSavedSearch(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('search-1')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
