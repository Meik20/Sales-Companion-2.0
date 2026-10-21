import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollDirection } from '../useScrollDirection'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/search',
}))

describe('useScrollDirection', () => {
  let mockContainer: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    mockContainer = document.createElement('div')
    mockContainer.id = 'main-scroll-container'
    document.body.appendChild(mockContainer)
  })

  afterEach(() => {
    document.body.removeChild(mockContainer)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should initialize with visible: true', () => {
    const { result } = renderHook(() =>
      useScrollDirection({ containerId: 'main-scroll-container', threshold: 20 })
    )
    expect(result.current).toBe(true)
  })

  it('should hide nav when scrolling down past threshold', () => {
    const { result } = renderHook(() =>
      useScrollDirection({ containerId: 'main-scroll-container', threshold: 20, topThreshold: 10 })
    )

    // Simulate scrolling down to 100px
    Object.defineProperty(mockContainer, 'scrollTop', { value: 100, configurable: true })
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
      vi.runAllTimers()
    })

    expect(result.current).toBe(false)
  })

  it('should reveal nav when scrolling up', () => {
    const { result } = renderHook(() =>
      useScrollDirection({ containerId: 'main-scroll-container', threshold: 20, topThreshold: 10 })
    )

    // Scroll down to 200px
    Object.defineProperty(mockContainer, 'scrollTop', { value: 200, configurable: true })
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
      vi.runAllTimers()
    })
    expect(result.current).toBe(false)

    // Scroll up to 150px (diff = -50, > threshold 20)
    Object.defineProperty(mockContainer, 'scrollTop', { value: 150, configurable: true })
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
      vi.runAllTimers()
    })
    expect(result.current).toBe(true)
  })

  it('should always be visible near top', () => {
    const { result } = renderHook(() =>
      useScrollDirection({ containerId: 'main-scroll-container', threshold: 20, topThreshold: 30 })
    )

    // Scroll down
    Object.defineProperty(mockContainer, 'scrollTop', { value: 150, configurable: true })
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
      vi.runAllTimers()
    })
    expect(result.current).toBe(false)

    // Jump near top (scrollTop <= 30)
    Object.defineProperty(mockContainer, 'scrollTop', { value: 15, configurable: true })
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
      vi.runAllTimers()
    })
    expect(result.current).toBe(true)
  })
})
