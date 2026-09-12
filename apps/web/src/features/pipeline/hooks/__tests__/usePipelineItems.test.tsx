import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { usePipelineItems } from '../usePipelineItems'
import { getDocsWithOfflineFallback } from '@/lib/firestore-offline'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    },
  }),
}))

vi.mock('@/services/firebase/client', () => ({
  firestore: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}))

vi.mock('@/lib/firestore-offline', () => ({
  getDocsWithOfflineFallback: vi.fn(),
  formatTimestamp: (v: any) => v || '2026-09-12T00:00:00.000Z',
}))


describe('usePipelineItems', () => {
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

  it('should fetch pipeline items successfully', async () => {
    const mockDocs = [
      {
        id: 'item-1',
        data: () => ({
          userId: 'test-user-id',
          companyName: 'Company A',
          status: 'prospection',
        }),
      },
    ]

    vi.mocked(getDocsWithOfflineFallback).mockImplementation(async (q: any) => {
      return { docs: mockDocs } as any
    })

    const { result } = renderHook(() => usePipelineItems(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.companyName).toBe('Company A')
  })

  it('should handle empty pipeline', async () => {
    vi.mocked(getDocsWithOfflineFallback).mockResolvedValue({
      docs: [],
    } as any)

    const { result } = renderHook(() => usePipelineItems(), { wrapper })


    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(0)
  })

  it('should handle fetch errors', async () => {
    vi.mocked(getDocsWithOfflineFallback).mockRejectedValueOnce(new Error('Firestore error'))

    const { result } = renderHook(() => usePipelineItems(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

