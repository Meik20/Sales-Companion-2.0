import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('supabase-companies', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('filters company search by country_code and returns the Supabase count', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'CM_123', country_code: 'CM' }]), {
        status: 200,
        headers: { 'content-range': '0-0/1' }
      })
    )

    const { searchSupabaseCompanies } = await import('../supabase-companies')
    const result = await searchSupabaseCompanies({ country: 'cm', query: 'pharmacie' })

    expect(result?.total).toBe(1)
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const url = new URL(requestUrl)
    expect(url.searchParams.get('country_code')).toBe('eq.CM')
    expect(url.searchParams.get('or')).toContain('raison_sociale.ilike.*pharmacie*')
    expect(requestInit.headers).toEqual(
      expect.objectContaining({ apikey: 'test-service-role-key' })
    )
  })

  it('bulk upserts records in chunks of 500', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }))

    const { bulkUpsertSupabaseCompanies } = await import('../supabase-companies')
    const records = Array.from({ length: 501 }, (_, index) => ({
      id: `CM_${index}`,
      country_code: 'CM',
      raison_sociale: `Company ${index}`
    }))

    const result = await bulkUpsertSupabaseCompanies(records)

    expect(result).toEqual({ success: true, count: 501 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toHaveLength(500)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toHaveLength(1)
  })
})
