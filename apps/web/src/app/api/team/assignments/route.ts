// apps/web/src/app/api/team/assignments/route.ts
// Façade HTTP pour la gestion des assignations de prospects d'équipe.
// Rôle strict : Guards d'authentification + validation de payload + appel au service métier.

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateServerRequest,
  assertManagerWithActivePlan,
  AuthGuardError
} from '@/server/guards/auth.guard'
import {
  TeamAssignmentService,
  AssignmentBusinessError
} from '@/server/services/team-assignment.service'

/**
 * GET /api/team/assignments
 * Retourne toutes les assignations créées par le manager authentifié.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await authenticateServerRequest(request)
    assertManagerWithActivePlan(session)

    const items = await TeamAssignmentService.getAssignmentsByManager(session.uid)
    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[team/assignments GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/team/assignments
 * Assigne un prospect à un membre d'équipe ou agent support.
 * Payload: { pipelineItemId: string, memberId: string, companyName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authenticateServerRequest(request)
    assertManagerWithActivePlan(session)

    if (session.userData.emailVerificationPending === true || session.emailVerified !== true) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      pipelineItemId?: string
      memberId?: string
      companyName?: string
    }

    const { pipelineItemId, memberId, companyName } = body

    if (!pipelineItemId || !memberId) {
      return NextResponse.json({ message: 'pipelineItemId et memberId requis' }, { status: 400 })
    }

    const result = await TeamAssignmentService.createAssignment(session, {
      pipelineItemId,
      memberId,
      companyName
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (error instanceof AssignmentBusinessError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[team/assignments POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
