export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateServerRequest, AuthGuardError } from '@/server/guards/auth.guard'

function normalizeStatus(s: string) {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st))
    return 'prospection'
  if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) return 'negociation'
  if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return 'conclue'
  return 'prospection'
}

/**
 * GET /api/pipeline/manager
 *
 * Pipeline consolidé de l'équipe pour le Team Manager (et Senior Manager pour ses leads propres).
 * Source de vérité serveur via Admin SDK.
 * Accessible en consultation même en plan FREE (AGENTS.md).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await authenticateServerRequest(request)
    if (session.role !== 'manager' && session.role !== 'admin') {
      return NextResponse.json({ message: 'Accès réservé aux managers' }, { status: 403 })
    }

    const { adminDb } = await import('@/lib/firebase-admin')
    const managerUid = session.uid

    // 1. Opportunités assignées à l'équipe du manager (managerUid === managerUid)
    const teamSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    // 2. Opportunités créées directement par le manager (userId === managerUid)
    const ownSnap = await adminDb
      .collection('pipeline')
      .where('userId', '==', managerUid)
      .get()

    const seen = new Set<string>()
    const assignedCompanies = new Set<string>()
    const items: Record<string, unknown>[] = []

    // A. Traitement des fiches d'équipe (membres et prospects assignés)
    teamSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.archived === true) return

      seen.add(doc.id)
      const compName = String(data.companyName || data.name || '')
        .trim()
        .toLowerCase()
      if (compName) {
        assignedCompanies.add(compName)
      }

      items.push({
        id: doc.id,
        ...data,
        companyName: (data.companyName || data.name || '') as string,
        companyId: (data.companyId || doc.id) as string,
        status: normalizeStatus(data.status as string),
        userId: (data.userId || managerUid) as string,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
        concludedAt: data.concludedAt?.toDate?.()?.toISOString() ?? (typeof data.concludedAt === 'string' ? data.concludedAt : null)
      })
    })

    // B. Traitement des fiches propres du manager non encore capturées
    for (const doc of ownSnap.docs) {
      if (!seen.has(doc.id)) {
        const data = doc.data()
        if (data.archived === true) continue

        const compName = String(data.companyName || data.name || '')
          .trim()
          .toLowerCase()

        // RÈGLE D'OR ARCHITECTURALE (AGENTS.md) :
        // Si la fiche a un managerUid explicitement attribué à un AUTRE manager (ex: l'ancien TM
        // sous lequel ce commercial travaillait avant d'être promu), cette fiche n'appartient PAS
        // à la supervision du manager connecté.
        // En particulier, les opportunités conclues restent la propriété exclusive de l'ancien TM.
        if (data.managerUid && data.managerUid !== managerUid) {
          continue
        }

        // Déduplication : si l'entreprise est déjà assignée à un membre terrain dans teamSnap,
        // la copie initiale non assignée est masquée.
        if (
          compName &&
          assignedCompanies.has(compName) &&
          data.assignedTo &&
          data.assignedTo !== managerUid
        ) {
          continue
        }

        seen.add(doc.id)
        items.push({
          id: doc.id,
          ...data,
          companyName: (data.companyName || data.name || '') as string,
          companyId: (data.companyId || doc.id) as string,
          status: normalizeStatus(data.status as string),
          userId: (data.userId || managerUid) as string,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
          concludedAt: data.concludedAt?.toDate?.()?.toISOString() ?? (typeof data.concludedAt === 'string' ? data.concludedAt : null)
        })
      }
    }

    // Tri chronologique antéchronologique
    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(items)
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[pipeline/manager GET]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
