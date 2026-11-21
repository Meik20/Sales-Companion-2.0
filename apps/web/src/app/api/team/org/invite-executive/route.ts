import { NextRequest, NextResponse } from 'next/server'
import { POST as handleInvite } from '../invite/route'

/**
 * POST /api/team/org/invite-executive
 * Raccourci explicite pour générer une invitation Direction / Observateur Exécutif (Forfait Enterprise).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const modifiedReq = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, type: 'executive' })
    })
    return handleInvite(modifiedReq)
  } catch {
    return handleInvite(request)
  }
}
