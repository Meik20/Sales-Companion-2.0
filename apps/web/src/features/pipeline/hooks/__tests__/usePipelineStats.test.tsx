import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/query-client'
import { usePipelineStats } from '../usePipelineStats'
import { getDocsWithOfflineFallback } from '@/lib/firestore-offline'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      role: 'independent',
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
}))


describe('usePipelineStats', () => {
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

  it('should fetch pipeline stats successfully', async () => {
    const mockDocs = [
      { id: '1', data: () => ({ status: 'prospection' }) },
      { id: '2', data: () => ({ status: 'negociation' }) },
      { id: '3', data: () => ({ status: 'conclue' }) },
    ]

    vi.mocked(getDocsWithOfflineFallback).mockImplementation(async () => {
      return { docs: mockDocs } as any
    })

    const { result } = renderHook(() => usePipelineStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.total).toBe(3)
    expect(result.current.data?.conclusion).toBe(1)
  })

  it('should return default stats on error', async () => {
    vi.mocked(getDocsWithOfflineFallback).mockRejectedValue(new Error('Firestore error'))

    const { result } = renderHook(() => usePipelineStats(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

