import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { useDeletePipelineItem } from '../useDeletePipelineItem'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('useDeletePipelineItem', () => {
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

  it('should delete pipeline item successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, id: 'item-1' }),
    })

    const { result } = renderHook(() => useDeletePipelineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('item-1')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
