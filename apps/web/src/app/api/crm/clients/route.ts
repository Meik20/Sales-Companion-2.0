export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/crm/clients
 *
 * Pour un support_agent :
 *   1. Retourne les prospects qu'il a lui-même importés (manager_prospects où importedBy == agentUid)
 *   2. Retourne aussi les clients pipeline "conclus/conclue" de ses managers liés
 *
 * Pour un manager :
 *   Retourne les clients pipeline "conclus/conclue" de son propre uid
 *
 * Pour un admin :
 *   Retourne tous les clients pipeline conclus
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Récupérer le profil de l'utilisateur
    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()

    if (!agentData) {
      return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })
    }

    if (!['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    // ── Admin : tous les clients conclus ──────────────────────────────────
    if (agentData.role === 'admin') {
      const allSnap = await adminDb
        .collection('pipeline')
        .where('status', 'in', ['conclue', 'conclusion'])
        .get()

      const clients = allSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
        nextFollowUp: doc.data().nextFollowUp?.toDate?.()?.toISOString() ?? doc.data().nextFollowUp ?? null
      }))
      return NextResponse.json(clients)
    }

    // ── Manager : clients pipeline conclus uniquement ──────────────────────
    if (agentData.role === 'manager') {
      const snap = await adminDb
        .collection('pipeline')
        .where('managerUid', '==', agentUid)
        .where('status', 'in', ['conclue', 'conclusion'])
        .get()

      const clients = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
        nextFollowUp: doc.data().nextFollowUp?.toDate?.()?.toISOString() ?? doc.data().nextFollowUp ?? null
      }))

      clients.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0
        const tb = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0
        return tb - ta
      })

      return NextResponse.json(clients)
    }

    // ── Support Agent : prospects importés + clients conclus des managers liés ──
    const seen = new Set<string>()
    const clients: Record<string, unknown>[] = []

    // 1. Prospects que l'agent a importés directement (manager_prospects)
    const importedSnap = await adminDb
      .collection('manager_prospects')
      .where('importedBy', '==', agentUid)
      .limit(3000)
      .get()

    for (const doc of importedSnap.docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id)
        const data = doc.data()
        clients.push({
          id: doc.id,
          companyName: data.name ?? data.companyName ?? '',
          companyCity: data.city ?? data.companyCity ?? '',
          companySector: data.sector ?? data.companySector ?? '',
          companyPhone: data.phone ?? data.companyPhone ?? '',
          companyEmail: data.email ?? data.companyEmail ?? '',
          status: data.status ?? 'imported',
          notes: data.notes ?? '',
          importedBy: data.importedBy,
          managerId: data.managerId,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
          _source: 'imported'
        })
      }
    }

    // 2. Clients pipeline conclus des managers liés
    const managerUids: string[] = [
      agentData.managerUid,
      ...(agentData.linkedManagerUids ?? [])
    ].filter(Boolean) as string[]

    if (managerUids.length > 0) {
      const snapshots = await Promise.all(
        managerUids.map(uid =>
          adminDb
            .collection('pipeline')
            .where('managerUid', '==', uid)
            .where('status', 'in', ['conclue', 'conclusion'])
            .get()
        )
      )

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id)
            clients.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
              updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
              nextFollowUp: doc.data().nextFollowUp?.toDate?.()?.toISOString() ?? doc.data().nextFollowUp ?? null,
              _source: 'pipeline'
            })
          }
        }
      }
    }

    // Trier par date de création décroissante (les plus récents en premier)
    clients.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('[crm/clients GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
