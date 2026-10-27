import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('supabase-private-prospects', () => {
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

  it('checks if private_prospects table is available', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const { isPrivateProspectsTableAvailable } = await import('../supabase-private-prospects')
    const available = await isPrivateProspectsTableAvailable()

    expect(available).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/rest/v1/private_prospects?limit=1')
  })

  it('enforces multi-tenant guard on bulkInsertPrivateProspects', async () => {
    const { bulkInsertPrivateProspects } = await import('../supabase-private-prospects')
    // Attempting to insert without org_code, user_id or manager_uid must be rejected
    await expect(
      bulkInsertPrivateProspects([
        {
          id: 'p1',
          company_name: 'Acme Corp',
          country_code: 'CM',
          user_id: '',
          org_code: null,
          manager_uid: null,
          status: 'new'
        } as any
      ])
    ).rejects.toThrow('Sécurité multi-tenant')
  })

  it('bulk inserts records in batches of 500 when tenant identifier is present', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }))

    const { bulkInsertPrivateProspects } = await import('../supabase-private-prospects')
    const records = Array.from({ length: 502 }, (_, i) => ({
      id: `prospect_${i}`,
      org_code: 'SC-CM-TEST1',
      user_id: 'user_1',
      manager_uid: 'manager_1',
      assigned_to: null,
      assigned_member_name: null,
      company_name: `Prospect ${i}`,
      country_code: 'CM',
      sector: 'Commerce',
      city: 'Douala',
      quarter: null,
      region: null,
      phone: '+237699000000',
      email: `test${i}@domain.cm`,
      notes: null,
      status: 'new',
      transfer_deadline: null,
      assignment_deadline: null,
      transferred_to_manager_uid: null,
      transferred_from_senior_uid: null,
      pipeline_entry_id: null
    }))

    const result = await bulkInsertPrivateProspects(records)

    expect(result).toEqual({ success: true, count: 502 })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Check payload of first batch
    const [firstCallUrl, firstCallInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(firstCallUrl).toContain('/rest/v1/private_prospects')
    const firstBody = JSON.parse(String(firstCallInit.body))
    expect(firstBody).toHaveLength(500)
    expect(firstBody[0].org_code).toBe('SC-CM-TEST1')
    expect(firstBody[0].company_name).toBe('Prospect 0')

    // Check payload of second batch
    const [, secondCallInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    const secondBody = JSON.parse(String(secondCallInit.body))
    expect(secondBody).toHaveLength(2)
  })

  it('enforces multi-tenant guard on getPrivateProspects', async () => {
    const { getPrivateProspects } = await import('../supabase-private-prospects')
    await expect(getPrivateProspects({})).rejects.toThrow('Sécurité multi-tenant')
  })

  it('fetches private prospects filtered by orgCode and managerUid with pagination', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'p_1',
            org_code: 'SC-CM-ORG1',
            manager_uid: 'mgr_1',
            user_id: 'user_1',
            company_name: 'Entreprise ABC',
            phone: '+237677112233',
            email: 'contact@abc.cm',
            status: 'new',
            created_at: '2026-10-18T10:00:00Z',
            updated_at: '2026-10-18T10:00:00Z'
          }
        ]),
        {
          status: 200,
          headers: { 'content-range': '0-0/1' }
        }
      )
    )

    const { getPrivateProspects, supabasePrivateProspectToApp } = await import('../supabase-private-prospects')
    const result = await getPrivateProspects({
      orgCode: 'SC-CM-ORG1',
      managerUid: 'mgr_1',
      status: 'new',
      limit: 20,
      offset: 0
    })

    expect(result.total).toBe(1)
    expect(result.prospects).toHaveLength(1)
    expect(result.prospects[0]!.company_name).toBe('Entreprise ABC')
    expect(result.prospects[0]!.org_code).toBe('SC-CM-ORG1')

    const appProspect = supabasePrivateProspectToApp(result.prospects[0]!)
    expect(appProspect.name).toBe('Entreprise ABC')
    expect(appProspect.orgCode).toBe('SC-CM-ORG1')

    const [requestUrl] = fetchMock.mock.calls[0] as [string, RequestInit]
    const url = new URL(requestUrl)
    expect(url.searchParams.get('org_code')).toBe('eq.SC-CM-ORG1')
    expect(url.searchParams.get('or')).toContain('manager_uid.eq.mgr_1')
    expect(url.searchParams.get('status')).toBe('eq.new')
  })

  it('updates a private prospect while requiring tenant guard', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const { updatePrivateProspect } = await import('../supabase-private-prospects')

    // Missing tenant guard throws
    await expect(
      updatePrivateProspect('p_1', { status: 'conclue' }, {})
    ).rejects.toThrow('Sécurité multi-tenant')

    // Valid update with tenant guard
    await updatePrivateProspect(
      'p_1',
      { status: 'conclue', notes: 'Updated notes' },
      { orgCode: 'SC-CM-ORG1' }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const url = new URL(requestUrl)
    expect(url.searchParams.get('id')).toBe('eq.p_1')
    expect(url.searchParams.get('org_code')).toBe('eq.SC-CM-ORG1')
    expect(requestInit.method).toBe('PATCH')
    const body = JSON.parse(String(requestInit.body))
    expect(body.status).toBe('conclue')
    expect(body.notes).toBe('Updated notes')
  })

  it('deletes a private prospect while requiring tenant guard', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const { deletePrivateProspect } = await import('../supabase-private-prospects')

    // Missing tenant guard throws
    await expect(deletePrivateProspect('p_1', {})).rejects.toThrow('Sécurité multi-tenant')

    // Valid delete with userId guard
    await deletePrivateProspect('p_1', { userId: 'user_42' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const url = new URL(requestUrl)
    expect(url.searchParams.get('id')).toBe('eq.p_1')
    expect(url.searchParams.get('user_id')).toBe('eq.user_42')
    expect(requestInit.method).toBe('DELETE')
  })
})
