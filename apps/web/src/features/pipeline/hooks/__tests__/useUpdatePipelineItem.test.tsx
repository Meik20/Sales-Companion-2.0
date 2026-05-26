import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { useUpdatePipelineItem } from '../useUpdatePipelineItem'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

describe('useUpdatePipelineItem', () => {
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

  it('should update pipeline item successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'item-1',
        status: 'negotiation',
      }),
    })

    const { result } = renderHook(() => useUpdatePipelineItem(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'item-1',
        data: { status: 'negotiation' },
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
