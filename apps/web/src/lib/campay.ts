/**
 * campay.ts — Client CAMPAY REST API
 * Sandbox : https://demo.campay.net/api
 * Production : https://www.campay.net/api
 */

const CAMPAY_BASE_URL = process.env.CAMPAY_BASE_URL ?? 'https://demo.campay.net/api'
const CAMPAY_APP_USERNAME = process.env.CAMPAY_APP_USERNAME ?? ''
const CAMPAY_APP_PASSWORD = process.env.CAMPAY_APP_PASSWORD ?? ''

export interface CampayTokenResponse {
  token: string
}

export interface CampayCollectRequest {
  amount: string          // Montant en FCFA (ex: "15000")
  from: string            // Numéro Mobile Money (ex: "237690000000")
  description: string     // Description de la transaction
  external_reference: string // Référence unique côté Sales Companion
}

export interface CampayCollectResponse {
  reference: string       // Référence CAMPAY à conserver
  ussd_code: string       // Code USSD à composer (MTN)
  operator: string        // "MTN" | "ORANGE"
  status: string          // "SUCCESSFUL" | "FAILED" | "PENDING"
}

export interface CampayTransactionStatus {
  reference: string
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
  amount: string
  description: string
  external_reference: string
  operator: string
}

// ── Obtenir un token d'accès CAMPAY ──────────────────────────────────────────
export async function getCampayToken(): Promise<string> {
  const res = await fetch(`${CAMPAY_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: CAMPAY_APP_USERNAME,
      password: CAMPAY_APP_PASSWORD,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY token error ${res.status}: ${text}`)
  }

  const data: CampayTokenResponse = await res.json()
  return data.token
}

// ── Initier un paiement Mobile Money ─────────────────────────────────────────
export async function campayCollect(
  payload: CampayCollectRequest
): Promise<CampayCollectResponse> {
  const token = await getCampayToken()

  const res = await fetch(`${CAMPAY_BASE_URL}/collect/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY collect error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Vérifier le statut d'une transaction ─────────────────────────────────────
export async function campayGetTransaction(
  reference: string
): Promise<CampayTransactionStatus> {
  const token = await getCampayToken()

  const res = await fetch(`${CAMPAY_BASE_URL}/transaction/${reference}/`, {
    headers: { Authorization: `Token ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CAMPAY transaction error ${res.status}: ${text}`)
  }

  return res.json()
}
