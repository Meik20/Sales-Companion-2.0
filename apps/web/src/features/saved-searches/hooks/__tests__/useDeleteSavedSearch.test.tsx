import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeleteSavedSearch } from '../useDeleteSavedSearch'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'

vi.mock('@/repositories/saved-searches.repository', () => ({
  savedSearchesRepository: {
    delete: vi.fn().mockResolvedValue(undefined)
  }
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
    const { result } = renderHook(() => useDeleteSavedSearch(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('search-1')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(savedSearchesRepository.delete).toHaveBeenCalledWith('search-1')
  })
})

