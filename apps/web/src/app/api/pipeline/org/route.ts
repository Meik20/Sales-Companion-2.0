// apps/web/src/app/api/pipeline/org/route.ts
// Façade HTTP du pipeline consolidé pour le Senior Manager.
// Rôle : Guard d'authentification + appel au service métier isolé.
import { NextRequest, NextResponse } from 'next/server'
import { authenticateServerRequest, assertSeniorManagerRole, AuthGuardError } from '@/server/guards/auth.guard'
import { fetchOrgConsolidatedPipeline } from '@/server/services/pipeline-org.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pipeline/org
 * Pipeline consolidé de toute l'organisation — Senior Manager (accessible en consultation même en plan FREE).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Guard de sécurité et d'autorisation (rôle Senior Manager)
    const session = await authenticateServerRequest(request)
    assertSeniorManagerRole(session)

    // 2. Extraction des paramètres de filtrage
    const { searchParams } = new URL(request.url)
    const filterManagerUid = searchParams.get('managerUid')
    const filterStatus = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '500', 10)

    // 3. Appel du service métier pur
    const result = await fetchOrgConsolidatedPipeline({
      orgCode: session.orgCode!,
      callerUid: session.uid,
      callerSegment: session.segment,
      filterManagerUid,
      filterStatus,
      limit
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[pipeline/org GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
