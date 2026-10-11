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

  it('pages through all records while preserving Supabase fields in app records', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'CM_1',
            country_code: 'CM',
            raison_sociale: 'Entreprise Un',
            raw_data: { regime: 'Réel' }
          }
        ]),
        { status: 200, headers: { 'content-range': '0-0/1' } }
      )
    )

    const { getAllSupabaseCompanies, supabaseCompanyToAppRecord } =
      await import('../supabase-companies')
    const companies = await getAllSupabaseCompanies(10)
    const appRecord = supabaseCompanyToAppRecord(companies[0]!)

    expect(companies).toHaveLength(1)
    expect(appRecord).toMatchObject({
      id: 'CM_1',
      raisonSociale: 'Entreprise Un',
      country: 'CM',
      regime: 'Réel'
    })
  })

  it('returns an exact filtered count and deletes a company by id', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { 'content-range': '*/7' } })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const { countSupabaseCompanies, deleteSupabaseCompany } = await import('../supabase-companies')
    await expect(countSupabaseCompanies({ city: 'Douala' })).resolves.toBe(7)
    await deleteSupabaseCompany('CM_1')

    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get('city')).toBe('eq.Douala')
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' })
    expect(new URL(fetchMock.mock.calls[1]![0]).searchParams.get('id')).toBe('eq.CM_1')
  })
})
