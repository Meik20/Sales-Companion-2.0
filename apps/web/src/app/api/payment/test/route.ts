import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payment/test
 * Diagnostic CAMPAY — vérifie les credentials et retourne les détails d'erreur.
 * À supprimer après débogage.
 */
export async function GET(request: NextRequest) {
  const BASE_URL           = process.env.CAMPAY_BASE_URL       ?? '⚠️ NON DÉFINIE (défaut sandbox)'
  const PERMANENT_TOKEN    = process.env.CAMPAY_PERMANENT_TOKEN ?? ''
  const APP_USERNAME       = process.env.CAMPAY_APP_USERNAME   ?? ''
  const APP_PASSWORD       = process.env.CAMPAY_APP_PASSWORD   ?? ''

  const config = {
    CAMPAY_BASE_URL:        BASE_URL,
    CAMPAY_PERMANENT_TOKEN: PERMANENT_TOKEN ? `SET (longueur: ${PERMANENT_TOKEN.length})` : '❌ NON DÉFINI',
    CAMPAY_APP_USERNAME:    APP_USERNAME    ? `SET (valeur: ${APP_USERNAME})`              : '❌ NON DÉFINI',
    CAMPAY_APP_PASSWORD:    APP_PASSWORD    ? `SET (longueur: ${APP_PASSWORD.length})`     : '❌ NON DÉFINI',
    mode:                   PERMANENT_TOKEN ? 'TOKEN PERMANENT' : 'USERNAME + PASSWORD',
  }

  // Test de l'obtention du token
  let tokenTest: Record<string, unknown> = {}

  if (PERMANENT_TOKEN) {
    tokenTest = {
      method: 'Permanent Token',
      token:  `${PERMANENT_TOKEN.slice(0, 8)}...${PERMANENT_TOKEN.slice(-4)}`,
    }

    // Test du collect avec le permanent token
    const collectRes = await fetch(`${process.env.CAMPAY_BASE_URL ?? 'https://demo.campay.net/api'}/collect/`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Token ${PERMANENT_TOKEN}`,
      },
      body: JSON.stringify({ amount: '1', currency: 'XAF', from: '237600000000', description: 'test', external_reference: 'test-ping' }),
    })
    const collectText = await collectRes.text()
    tokenTest.collectStatus = collectRes.status
    try { tokenTest.collectBody = JSON.parse(collectText) } catch { tokenTest.collectBody = collectText }

  } else if (APP_USERNAME && APP_PASSWORD) {
    // Essai d'obtention du token via username/password
    const tokenUrl = `${process.env.CAMPAY_BASE_URL ?? 'https://demo.campay.net/api'}/token/`
    const tokenRes = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: APP_USERNAME, password: APP_PASSWORD }),
    })
    const tokenText = await tokenRes.text()
    let tokenBody: Record<string, unknown> = {}
    try { tokenBody = JSON.parse(tokenText) } catch { tokenBody = { raw: tokenText } }

    tokenTest = {
      method:      'Username + Password',
      tokenStatus: tokenRes.status,
      tokenBody,
      accessToken: tokenBody.token ? `${String(tokenBody.token).slice(0, 8)}...` : '❌ champ "token" absent',
    }
  } else {
    tokenTest = { error: '❌ Aucune credential configurée' }
  }

  return NextResponse.json({ config, tokenTest }, { status: 200 })
}
