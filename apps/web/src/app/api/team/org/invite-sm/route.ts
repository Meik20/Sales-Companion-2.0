import { NextRequest, NextResponse } from 'next/server'
import { POST as handleInvite } from '../invite/route'

/**
 * POST /api/team/org/invite-sm
 * Raccourci explicite pour générer une invitation Senior Manager (nouveau segment).
 */
export async function POST(request: NextRequest) {
  // Cloner la requête et injecter type: 'senior_manager'
  try {
    const body = await request.json().catch(() => ({}))
    const modifiedReq = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, type: 'senior_manager' })
    })
    return handleInvite(modifiedReq)
  } catch {
    return handleInvite(request)
  }
}
