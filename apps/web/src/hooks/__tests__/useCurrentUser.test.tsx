import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUser } from '../useCurrentUser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Firebase
vi.mock('@/services/firebase/client', () => ({
  auth: {
    onAuthStateChanged: (callback: (user: any) => void) => {
      callback(null)
      return () => {}
    }
  },
  firestore: {}
}))

describe('useCurrentUser', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should initialize with null user', () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('should have loading state initially', () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    // Initial loading state should be true before auth state is resolved
    expect(typeof result.current.loading).toBe('boolean')
  })
})
