// apps/web/src/app/api/pipeline/org/route.ts
// Façade HTTP du pipeline consolidé pour le Senior Manager.
// Rôle : Guard d'authentification + appel au service métier isolé.
import { NextRequest, NextResponse } from 'next/server'
import { authenticateServerRequest, assertSeniorManagerOrExecutive, AuthGuardError } from '@/server/guards/auth.guard'
import { fetchOrgConsolidatedPipeline } from '@/server/services/pipeline-org.service'
import { resolveCallerSegmentAccess } from '@/lib/org-scope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pipeline/org
 * Pipeline consolidé de toute l'organisation — Senior Manager & Direction (accessible en consultation même en plan FREE).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Guard de sécurité et d'autorisation (rôle Senior Manager ou Direction)
    const session = await authenticateServerRequest(request)
    assertSeniorManagerOrExecutive(session)

    // 2. Extraction des paramètres de filtrage
    const { searchParams } = new URL(request.url)
    const filterManagerUid = searchParams.get('managerUid')
    const filterStatus = searchParams.get('status')
    const period = searchParams.get('period')
    const requestedSegment = searchParams.get('segment')
    const limit = parseInt(searchParams.get('limit') || '500', 10)

    // Vérification et isolation stricte du segment pour l'Exécutif et pour le Coordinateur (titulaire vs intérim)
    const segmentAccess = resolveCallerSegmentAccess({
      callerOrgRole: session.orgRole || 'team_manager',
      callerSegment: session.segment ?? null,
      callerSegments: Array.isArray(session.segments) ? session.segments : null,
      callerInterimSegments: Array.isArray(session.interimSegments) ? session.interimSegments : null,
      requestedSegment
    })
    if (!segmentAccess.ok) {
      return NextResponse.json({ error: segmentAccess.error }, { status: segmentAccess.status })
    }
    const effectiveSegment = segmentAccess.targetSegment

    // 3. Appel du service métier pur
    const result = await fetchOrgConsolidatedPipeline({
      orgCode: session.orgCode!,
      callerUid: session.uid,
      callerOrgRole: session.orgRole,
      callerSegment: effectiveSegment,
      filterManagerUid,
      filterStatus,
      limit,
      period
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
