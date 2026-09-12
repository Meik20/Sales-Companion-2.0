import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSavedSearches } from '../useSavedSearches'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      uid: 'test-user-id',
      getIdToken: vi.fn().mockResolvedValue('test-token')
    }
  })
}))

vi.mock('@/repositories/saved-searches.repository', () => ({
  savedSearchesRepository: {
    findByUserId: vi.fn(),
    delete: vi.fn(),
    create: vi.fn()
  }
}))

describe('useSavedSearches', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should fetch saved searches successfully', async () => {
    const mockSearches = [
      {
        id: 'search-1',
        userId: 'test-user-id',
        label: 'Tech Companies',
        filters: { sector: 'technology' },
        resultCount: 50,
        createdAt: '2026-09-12T00:00:00.000Z'
      }
    ]

    vi.mocked(savedSearchesRepository.findByUserId).mockResolvedValueOnce(mockSearches as any)

    const { result } = renderHook(() => useSavedSearches(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.label).toBe('Tech Companies')
  })

  it('should handle empty searches list', async () => {
    vi.mocked(savedSearchesRepository.findByUserId).mockResolvedValueOnce([])

    const { result } = renderHook(() => useSavedSearches(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(0)
  })
})

