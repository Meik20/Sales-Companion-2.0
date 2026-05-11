import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payment/test
 * Diagnostic CAMPAY étendu — teste toutes les combinaisons d'authentification.
 * À supprimer après débogage.
 */
export async function GET(request: NextRequest) {
  const BASE             = process.env.CAMPAY_BASE_URL        ?? 'https://demo.campay.net/api'
  const PERMANENT_TOKEN  = process.env.CAMPAY_PERMANENT_TOKEN ?? ''
  const APP_USERNAME     = process.env.CAMPAY_APP_USERNAME    ?? ''
  const APP_PASSWORD     = process.env.CAMPAY_APP_PASSWORD    ?? ''

  const config = {
    CAMPAY_BASE_URL:        BASE,
    CAMPAY_PERMANENT_TOKEN: PERMANENT_TOKEN ? `SET (longueur: ${PERMANENT_TOKEN.length})` : '❌ NON DÉFINI',
    CAMPAY_APP_USERNAME:    APP_USERNAME    ? `SET (valeur: ${APP_USERNAME})`              : '❌ NON DÉFINI',
    CAMPAY_APP_PASSWORD:    APP_PASSWORD    ? `SET (longueur: ${APP_PASSWORD.length})`     : '❌ NON DÉFINI',
  }

  const results: Record<string, unknown> = {}

  // ── Test A : Token permanent avec header "Token <x>" ──────────────────────
  if (PERMANENT_TOKEN) {
    const rA = await fetch(`${BASE}/collect/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${PERMANENT_TOKEN}` },
      body: JSON.stringify({ amount: '100', currency: 'XAF', from: '237600000000', description: 'test', external_reference: 'diag-A' }),
    })
    const tA = await rA.text()
    results['A_permanentToken_Token_header'] = {
      status: rA.status,
      body: (() => { try { return JSON.parse(tA) } catch { return tA } })(),
    }

    // ── Test B : Token permanent avec header "Bearer <x>" ─────────────────
    const rB = await fetch(`${BASE}/collect/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PERMANENT_TOKEN}` },
      body: JSON.stringify({ amount: '100', currency: 'XAF', from: '237600000000', description: 'test', external_reference: 'diag-B' }),
    })
    const tB = await rB.text()
    results['B_permanentToken_Bearer_header'] = {
      status: rB.status,
      body: (() => { try { return JSON.parse(tB) } catch { return tB } })(),
    }

    // ── Test C : Token permanent comme PASSWORD dans /token/ ──────────────
    // L'App Username doit être configuré séparément
    if (APP_USERNAME) {
      const rC = await fetch(`${BASE}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: APP_USERNAME, password: PERMANENT_TOKEN }),
      })
      const tC = await rC.text()
      let bodyC: Record<string, unknown> = {}
      try { bodyC = JSON.parse(tC) } catch { bodyC = { raw: tC } }
      results['C_username_plus_permanentToken_as_password'] = {
        status:       rC.status,
        body:         bodyC,
        tokenObtenu:  bodyC.token ? `✅ ${String(bodyC.token).slice(0, 8)}...` : '❌ pas de token',
      }
    } else {
      results['C_username_plus_permanentToken_as_password'] = '⏭ Ignoré (CAMPAY_APP_USERNAME non défini)'
    }
  }

  // ── Test D : Username + Password classique ─────────────────────────────
  if (APP_USERNAME && APP_PASSWORD) {
    const rD = await fetch(`${BASE}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: APP_USERNAME, password: APP_PASSWORD }),
    })
    const tD = await rD.text()
    let bodyD: Record<string, unknown> = {}
    try { bodyD = JSON.parse(tD) } catch { bodyD = { raw: tD } }
    results['D_username_password_classique'] = {
      status:      rD.status,
      body:        bodyD,
      tokenObtenu: bodyD.token ? `✅ ${String(bodyD.token).slice(0, 8)}...` : '❌ pas de token',
    }
  }

  const conclusion = Object.entries(results).find(([, v]) =>
    typeof v === 'object' && v !== null && ('status' in v) && (v as Record<string, unknown>).status === 200
  )

  return NextResponse.json({
    config,
    results,
    conclusion: conclusion
      ? `✅ ${conclusion[0]} FONCTIONNE`
      : '❌ Tous les tests ont échoué — vérifiez vos credentials dans le dashboard CAMPAY',
  }, { status: 200 })
}
