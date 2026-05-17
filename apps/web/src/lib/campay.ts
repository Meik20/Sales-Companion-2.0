/**
 * campay.ts — Client CAMPAY REST API
 *
 * Authentification :
 *   - Mode recommandé : CAMPAY_PERMANENT_TOKEN  (token permanent du dashboard)
 *   - Mode fallback   : CAMPAY_APP_USERNAME + CAMPAY_APP_PASSWORD (token temporaire via /token/)
 *
 * Sandbox :    CAMPAY_BASE_URL=https://demo.campay.net/api
 * Production : CAMPAY_BASE_URL=https://www.campay.net/api
 */

const CAMPAY_BASE_URL = process.env.CAMPAY_BASE_URL ?? 'https://demo.campay.net/api'
const CAMPAY_PERMANENT_TOKEN = process.env.CAMPAY_PERMANENT_TOKEN ?? ''
const CAMPAY_APP_USERNAME = process.env.CAMPAY_APP_USERNAME ?? ''
const CAMPAY_APP_PASSWORD = process.env.CAMPAY_APP_PASSWORD ?? ''

export interface CampayCollectRequest {
  amount: string // Montant en FCFA (ex: "15000")
  currency: string // Toujours "XAF" pour le Cameroun
  from: string // Numéro Mobile Money (ex: "237690000000")
  description: string // Description de la transaction
  external_reference: string // Référence unique côté Sales Companion
}

export interface CampayCollectResponse {
  reference: string // Référence CAMPAY à conserver
  ussd_code: string // Code USSD à composer (MTN)
  operator: string // "MTN" | "ORANGE"
  status: string // "SUCCESSFUL" | "FAILED" | "PENDING"
}

export interface CampayTransactionStatus {
  reference: string
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
  amount: string
  description: string
  external_reference: string
  operator: string
}

// ── Résoudre le token d'accès (permanent ou temporaire) ──────────────────────
async function resolveToken(): Promise<string> {
  // Priorité 1 : token permanent configuré dans les variables d'env
  if (CAMPAY_PERMANENT_TOKEN) {
    return CAMPAY_PERMANENT_TOKEN
  }

  // Priorité 2 : obtenir un token temporaire via username/password
  if (!CAMPAY_APP_USERNAME || !CAMPAY_APP_PASSWORD) {
    throw new Error(
      'CAMPAY : aucune clé configurée. Ajoutez CAMPAY_PERMANENT_TOKEN ' +
        "ou CAMPAY_APP_USERNAME + CAMPAY_APP_PASSWORD dans les variables d'env."
    )
  }

  const res = await fetch(`${CAMPAY_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: CAMPAY_APP_USERNAME,
      password: CAMPAY_APP_PASSWORD
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY token error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.token as string
}

// ── Initier un paiement Mobile Money ─────────────────────────────────────────
export async function campayCollect(payload: CampayCollectRequest): Promise<CampayCollectResponse> {
  const token = await resolveToken()

  const res = await fetch(`${CAMPAY_BASE_URL}/collect/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY collect error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Vérifier le statut d'une transaction ─────────────────────────────────────
export async function campayGetTransaction(reference: string): Promise<CampayTransactionStatus> {
  const token = await resolveToken()

  const res = await fetch(`${CAMPAY_BASE_URL}/transaction/${reference}/`, {
    headers: { Authorization: `Token ${token}` }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY transaction error ${res.status}: ${text}`)
  }

  return res.json()
}
