import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeStatus(s: string) {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st)) return 'prospection'
  if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) return 'negociation'
  if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return 'conclue'
  return 'prospection'
}

/**
 * GET /api/pipeline/org
 * Pipeline consolidé de toute l'organisation — Senior Manager uniquement.
 *
 * Agrège les items pipeline de tous les managers partageant le même orgCode.
 * Query params optionnels :
 *   - managerUid  : filtrer sur un seul manager de l'org
 *   - status      : prospection | negociation | conclue
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier que le caller est bien un Senior Manager
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()

    if (!callerData || !hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json({ error: 'Un abonnement Manager actif et vérifié est requis.' }, { status: 403 })
    }

    if (callerData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { error: 'Accès réservé au Senior Manager de l\'organisation' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation trouvé' }, { status: 400 })
    }

    // Récupérer tous les managers de l'organisation
    const orgManagersSnap = await adminDb
      .collection('users')
      .where('orgCode', '==', orgCode)
      .where('role', '==', 'manager')
      .get()

    const orgManagerUids = orgManagersSnap.docs.map(d => d.id)
    const managersMap: Record<string, { name: string; orgRole: string }> = {}
    orgManagersSnap.docs.forEach(d => {
      const data = d.data()
      managersMap[d.id] = {
        name: data.displayName || data.name || data.email || d.id,
        orgRole: data.orgRole || 'team_manager'
      }
    })

    if (orgManagerUids.length === 0) {
      return NextResponse.json({ items: [], managers: [], counts: { prospection: 0, negociation: 0, conclue: 0, total: 0 } })
    }

    // Paramètres de filtre optionnels
    const { searchParams } = new URL(request.url)
    const filterManagerUid = searchParams.get('managerUid')
    const filterStatus = searchParams.get('status')

    // Si filtre sur un manager, vérifier qu'il appartient à l'org
    const targetManagerUids = filterManagerUid
      ? (orgManagerUids.includes(filterManagerUid) ? [filterManagerUid] : [])
      : orgManagerUids

    if (targetManagerUids.length === 0) {
      return NextResponse.json({ error: 'Manager non trouvé dans cette organisation' }, { status: 404 })
    }

    // Agréger les pipelines — Firestore 'in' est limité à 30 éléments
    const CHUNK_SIZE = 30
    const allItems: Record<string, unknown>[] = []
    const seen = new Set<string>()

    for (let i = 0; i < targetManagerUids.length; i += CHUNK_SIZE) {
      const chunk = targetManagerUids.slice(i, i + CHUNK_SIZE)
      let q = adminDb.collection('pipeline').where('managerUid', 'in', chunk) as FirebaseFirestore.Query

      if (filterStatus) {
        const statusVariants =
          filterStatus === 'prospection' ? ['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead']
          : filterStatus === 'negociation' ? ['negociation', 'negotiation', 'in_progress', 'en_cours']
          : filterStatus === 'conclue' ? ['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe']
          : [filterStatus]
        q = q.where('status', 'in', statusVariants)
      }

      const snap = await q.limit(500).get()
      snap.docs.forEach(d => {
        if (!seen.has(d.id)) {
          const data = d.data()
          // Strict multi-tenant guard: si la fiche a un orgCode explicite, il doit correspondre à celui de l'organisation
          if (data.orgCode && data.orgCode !== orgCode) {
            return
          }
          seen.add(d.id)
          const mgr = managersMap[data.managerUid as string]
          allItems.push({
            id: d.id,
            ...data,
            orgCode: data.orgCode || orgCode,
            status: normalizeStatus(data.status as string),
            managerName: mgr?.name ?? (data.managerName as string) ?? '',
            managerOrgRole: mgr?.orgRole ?? 'team_manager',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? null),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ?? null)
          })
        }
      })
    }

    // Tri : plus récent en premier
    allItems.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return tb - ta
    })

    // Compteurs
    const counts = {
      prospection: allItems.filter(i => i.status === 'prospection').length,
      negociation: allItems.filter(i => i.status === 'negociation').length,
      conclue: allItems.filter(i => i.status === 'conclue').length,
      total: allItems.length
    }

    // Liste des managers avec leurs stats — uniquement les Team Managers (le Senior Manager n'en fait pas partie)
    const teamManagersDocs = orgManagersSnap.docs.filter(d => (d.data().orgRole || 'team_manager') !== 'senior_manager')
    const managersWithStats = teamManagersDocs.map(d => {
      const data = d.data()
      const managerItems = allItems.filter(i => i.managerUid === d.id)
      return {
        uid: d.id,
        name: data.displayName || data.name || data.email || d.id,
        email: data.email || '',
        orgRole: data.orgRole || 'team_manager',
        isSenior: false,
        isCurrent: d.id === callerUid,
        stats: {
          prospection: managerItems.filter(i => i.status === 'prospection').length,
          negociation: managerItems.filter(i => i.status === 'negociation').length,
          conclue: managerItems.filter(i => i.status === 'conclue').length,
          total: managerItems.length
        }
      }
    })

    return NextResponse.json({
      items: allItems,
      managers: managersWithStats,
      counts,
      orgCode
    })
  } catch (error) {
    console.error('[pipeline/org GET]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
