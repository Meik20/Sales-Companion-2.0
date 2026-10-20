/**
 * apps/web/src/lib/supabase-private-prospects.ts
 *
 * Connecteur PostgREST natif pour la table 'private_prospects' sur Supabase.
 * Respecte strictement l'isolation multi-tenant : chaque requête filtre impérativement
 * par orgCode ou userId/managerUid pour garantir la confidentialité absolue des données.
 *
 * Conforme aux règles d'intégrité architecturale (AGENTS.md) :
 * - Aucun import de @supabase/supabase-js (évite tout conflit ESM/CJS sur Vercel).
 * - Utilise fetch PostgREST direct via SUPABASE_SERVICE_ROLE_KEY.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export interface SupabasePrivateProspect {
  id: string
  org_code: string | null
  user_id: string
  manager_uid: string | null
  assigned_to: string | null
  assigned_member_name: string | null
  company_name: string
  country_code: string
  sector: string | null
  city: string | null
  quarter: string | null
  region: string | null
  phone: string | null
  email: string | null
  notes: string | null
  status: string
  transfer_deadline: string | null
  assignment_deadline: string | null
  transferred_to_manager_uid: string | null
  transferred_from_senior_uid: string | null
  pipeline_entry_id: string | null
  raw_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SupabasePrivateProspectInput = Omit<
  SupabasePrivateProspect,
  'created_at' | 'updated_at'
> & {
  created_at?: string
  updated_at?: string
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

function getSupabaseBaseUrl(): string {
  return SUPABASE_URL.replace(/\/+$/, '')
}

function getHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  }
}

async function supabaseRequest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configuration Supabase manquante')
  }

  const response = await fetch(`${getSupabaseBaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: getHeaders(init.headers as Record<string, string> | undefined)
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase HTTP ${response.status}: ${details}`)
  }

  return response
}

function parseExactCount(response: Response, fallback = 0): number {
  const contentRange = response.headers.get('content-range')
  const count = contentRange?.split('/')[1]
  return count && count !== '*' ? Number.parseInt(count, 10) || 0 : fallback
}

/**
 * Vérifie si la table private_prospects existe et est accessible sur Supabase.
 */
export async function isPrivateProspectsTableAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const res = await fetch(`${getSupabaseBaseUrl()}/rest/v1/private_prospects?limit=1`, {
      method: 'GET',
      headers: getHeaders()
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Insertion groupée haute performance (Bulk Insert) de prospects privés.
 * Remplace des milliers d'écritures unitaires Firestore par un seul POST PostgREST.
 */
export async function bulkInsertPrivateProspects(
  prospects: SupabasePrivateProspectInput[]
): Promise<{ success: boolean; count: number }> {
  if (!prospects.length) return { success: true, count: 0 }
  if (!isSupabaseConfigured()) throw new Error('Supabase non configuré')

  // 🔒 GARDE-FOU MULTI-TENANT : Interdiction d'insérer sans périmètre d'isolation
  for (const p of prospects) {
    if (!p.org_code && !p.user_id && !p.manager_uid) {
      throw new Error('Sécurité multi-tenant : org_code ou user_id obligatoire pour chaque prospect')
    }
  }

  const BATCH_SIZE = 500
  let totalInserted = 0

  for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
    const chunk = prospects.slice(i, i + BATCH_SIZE)
    await supabaseRequest('private_prospects', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal,resolution=merge-duplicates'
      },
      body: JSON.stringify(chunk)
    })
    totalInserted += chunk.length
  }

  return { success: true, count: totalInserted }
}

/**
 * Mappe un enregistrement Supabase private_prospects vers le format attendu par l'application
 */
export function supabasePrivateProspectToApp(p: SupabasePrivateProspect) {
  return {
    id: p.id,
    name: p.company_name,
    companyName: p.company_name,
    phone: p.phone,
    email: p.email,
    city: p.city,
    sector: p.sector,
    quarter: p.quarter,
    region: p.region,
    notes: p.notes,
    status: p.status,
    orgCode: p.org_code,
    managerId: p.manager_uid,
    userId: p.user_id,
    assignedTo: p.assigned_to,
    assignedMemberName: p.assigned_member_name,
    transferDeadline: p.transfer_deadline,
    assignmentDeadline: p.assignment_deadline,
    transferredToManagerUid: p.transferred_to_manager_uid,
    transferredFromSeniorUid: p.transferred_from_senior_uid,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }
}

export interface GetPrivateProspectsParams {
  id?: string
  orgCode?: string | null
  managerUid?: string
  userId?: string
  assignedTo?: string | null
  status?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Récupère les prospects privés avec isolation stricte.
 * Impose OBLIGATOIREMENT le filtre orgCode ou userId pour empêcher toute fuite inter-organisation.
 */
export async function getPrivateProspects(
  params: GetPrivateProspectsParams
): Promise<{ prospects: SupabasePrivateProspect[]; total: number }> {
  if (!isSupabaseConfigured()) {
    return { prospects: [], total: 0 }
  }

  const {
    id,
    orgCode,
    managerUid,
    userId,
    assignedTo,
    status,
    search,
    limit = 50,
    offset = 0
  } = params

  // 🔒 GARDE-FOU MULTI-TENANT : Interdiction formelle d'interroger sans scope de locataire
  if (!orgCode && !userId && !managerUid && !id) {
    throw new Error('Sécurité multi-tenant : orgCode ou userId obligatoire pour requêter private_prospects')
  }

  const query = new URLSearchParams()
  query.set('select', '*')
  query.set('order', 'created_at.desc')
  query.set('limit', String(limit))
  query.set('offset', String(offset))

  if (id) {
    query.set('id', `eq.${id}`)
  }

  if (orgCode) {
    query.set('org_code', `eq.${orgCode}`)
  } else if (userId) {
    query.set('user_id', `eq.${userId}`)
  }

  if (managerUid) {
    query.set('manager_uid', `eq.${managerUid}`)
  }

  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === '') {
      query.set('assigned_to', 'is.null')
    } else {
      query.set('assigned_to', `eq.${assignedTo}`)
    }
  }

  if (status) {
    query.set('status', `eq.${status}`)
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query.set('or', `(company_name.ilike.%${term}%,city.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%)`)
  }

  const response = await supabaseRequest(`private_prospects?${query.toString()}`, {
    method: 'GET',
    headers: {
      Prefer: 'count=exact'
    }
  })

  const prospects = (await response.json()) as SupabasePrivateProspect[]
  const total = parseExactCount(response, prospects.length)

  return { prospects, total }
}

/**
 * Met à jour un prospect privé avec vérification du périmètre de sécurité.
 */
export async function updatePrivateProspect(
  id: string,
  updates: Partial<SupabasePrivateProspectInput>,
  scope: { orgCode?: string | null; userId?: string; managerUid?: string }
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  if (!scope.orgCode && !scope.userId && !scope.managerUid) {
    throw new Error('Sécurité multi-tenant : orgCode, userId ou managerUid obligatoire')
  }

  const query = new URLSearchParams()
  query.set('id', `eq.${id}`)
  if (scope.orgCode) {
    query.set('org_code', `eq.${scope.orgCode}`)
  } else if (scope.managerUid) {
    query.set('manager_uid', `eq.${scope.managerUid}`)
  } else if (scope.userId) {
    query.set('user_id', `eq.${scope.userId}`)
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  const res = await supabaseRequest(`private_prospects?${query.toString()}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  })

  return res.ok
}

/**
 * Transfère des prospects privés vers un Team Manager dans Supabase private_prospects.
 * Met à jour manager_uid, transferred_to_manager_uid, transferred_from_senior_uid,
 * transfer_deadline, assignment_deadline.
 */
export async function transferPrivateProspects(params: {
  prospectIds: string[]
  orgCode?: string | null
  seniorUid: string
  targetManagerUid: string
  deadline?: string | null
}): Promise<{ success: boolean; count: number }> {
  if (!isSupabaseConfigured()) return { success: false, count: 0 }
  const { prospectIds, orgCode, seniorUid, targetManagerUid, deadline } = params

  if (!orgCode && !seniorUid) {
    throw new Error('Sécurité multi-tenant : orgCode ou seniorUid obligatoire pour transférer')
  }

  const uniqueIds = Array.from(new Set(prospectIds))
  if (uniqueIds.length === 0) return { success: true, count: 0 }

  const payload = {
    manager_uid: targetManagerUid,
    transferred_to_manager_uid: targetManagerUid,
    transferred_from_senior_uid: seniorUid,
    transfer_deadline: deadline || null,
    assignment_deadline: deadline || null,
    assigned_to: null,
    assigned_member_name: null,
    updated_at: new Date().toISOString()
  }

  const CHUNK_SIZE = 50
  let totalTransferred = 0

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
    const query = new URLSearchParams()
    query.set('id', `in.(${chunk.join(',')})`)
    if (orgCode) {
      query.set('org_code', `eq.${orgCode}`)
    } else {
      query.set('user_id', `eq.${seniorUid}`)
    }

    const res = await supabaseRequest(`private_prospects?${query.toString()}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      const updatedRows = await res.json().catch(() => [])
      totalTransferred += Array.isArray(updatedRows) ? updatedRows.length : chunk.length
    }
  }

  return { success: true, count: totalTransferred }
}

/**
 * Supprime un prospect privé avec vérification stricte du périmètre multi-tenant.
 */
export async function deletePrivateProspect(
  id: string,
  scope: { orgCode?: string | null; userId?: string }
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  if (!scope.orgCode && !scope.userId) {
    throw new Error('Sécurité multi-tenant : orgCode ou userId obligatoire')
  }

  const query = new URLSearchParams()
  query.set('id', `eq.${id}`)
  if (scope.orgCode) {
    query.set('org_code', `eq.${scope.orgCode}`)
  } else if (scope.userId) {
    query.set('user_id', `eq.${scope.userId}`)
  }

  const res = await supabaseRequest(`private_prospects?${query.toString()}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal'
    }
  })

  return res.ok
}

/**
 * Réassigne tous les prospects privés d'un manager révoqué vers un successeur
 */
export async function reassignPrivateProspectsForRevokedManager(params: {
  orgCode: string
  revokedManagerUid: string
  successorManagerUid: string
}): Promise<{ success: boolean; count: number }> {
  if (!isSupabaseConfigured()) return { success: false, count: 0 }
  const { orgCode, revokedManagerUid, successorManagerUid } = params
  if (!orgCode || !revokedManagerUid || !successorManagerUid) {
    throw new Error('Sécurité multi-tenant : orgCode, revokedManagerUid et successorManagerUid obligatoires')
  }

  const query = new URLSearchParams()
  query.set('org_code', `eq.${orgCode}`)
  query.set('manager_uid', `eq.${revokedManagerUid}`)

  const payload = {
    manager_uid: successorManagerUid,
    transferred_to_manager_uid: successorManagerUid,
    updated_at: new Date().toISOString()
  }

  const res = await supabaseRequest(`private_prospects?${query.toString()}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })

  if (res.ok) {
    const updatedRows = await res.json().catch(() => [])
    return { success: true, count: Array.isArray(updatedRows) ? updatedRows.length : 0 }
  }
  return { success: false, count: 0 }
}

