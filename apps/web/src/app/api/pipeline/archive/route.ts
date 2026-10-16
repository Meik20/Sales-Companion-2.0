export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/pipeline/archive
 *
 * Gestion des archives du pipeline — réservé aux Team Managers (orgRole != senior_manager).
 *
 * Body: { action: 'archive', ids: string[] }   → archive une sélection de leads
 *       { action: 'restore', ids: string[] }    → restaure une sélection de leads
 *       { action: 'list' }                      → retourne tous les leads archivés du TM
 *
 * Règles :
 * - Seul un utilisateur avec role='manager' ET orgRole!='senior_manager' peut opérer.
 * - Seuls les leads dont managerUid==callerUid OU userId==callerUid sont accessibles.
 * - Les leads avec status='conclue'|'conclusion' ne peuvent pas être archivés.
 * - Les champs `archived`, `archivedAt`, `archivedBy` ne sont JAMAIS écrits côté client.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // ── Auth ──────────────────────────────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let callerUid: string
    let claimRole: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
      claimRole = (decoded.role as string) || ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // ── Lire le profil Firestore pour rôle définitif + orgRole ─────────────
    const userDoc = await adminDb.collection('users').doc(callerUid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ message: 'Profil utilisateur introuvable.' }, { status: 403 })
    }
    const userData = userDoc.data()!
    const firestoreRole: string = userData.role || claimRole || ''
    const orgRole: string = userData.orgRole || ''

    // ── Accès réservé aux Team Managers uniquement (pas Senior Manager) ────
    if (firestoreRole !== 'manager') {
      return NextResponse.json(
        { message: 'Accès réservé aux Team Managers.' },
        { status: 403 }
      )
    }
    if (orgRole === 'senior_manager') {
      return NextResponse.json(
        { message: 'La gestion des archives est réservée aux Team Managers.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({})) as {
      action?: string
      ids?: string[]
    }
    const { action, ids } = body

    if (!action || !['archive', 'restore', 'list'].includes(action)) {
      return NextResponse.json(
        { message: "Action invalide. Valeurs acceptées : 'archive', 'restore', 'list'." },
        { status: 400 }
      )
    }

    // ── Résolution des membres de l'équipe du TM ──────────────────────────
    const membersSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', callerUid)
      .get()
    const memberUids = new Set(membersSnap.docs.map((d) => d.id))

    // ── ACTION : LIST ─────────────────────────────────────────────────────
    if (action === 'list') {
      // Leads archivés dont ce TM est responsable (managerUid) OU créateur (userId)
      // Note : filtrage en mémoire pour éviter le besoin de composite index Firestore (managerUid + archived)
      const [teamSnap, ownSnap] = await Promise.all([
        adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
        adminDb.collection('pipeline').where('userId', '==', callerUid).get()
      ])

      const seen = new Set<string>()
      const results: Record<string, unknown>[] = []

      for (const snap of [teamSnap, ownSnap]) {
        for (const doc of snap.docs) {
          if (!seen.has(doc.id)) {
            const d = doc.data()
            if (d.archived === true) {
              seen.add(doc.id)
              results.push({ id: doc.id, ...d })
            }
          }
        }
      }

      // Récupérer également les fiches assignées aux membres de ce TM dont managerUid n'était pas encore synchronisé
      if (memberUids.size > 0) {
        const memberUidChunks: string[][] = []
        const allMemberUids = Array.from(memberUids)
        for (let i = 0; i < allMemberUids.length; i += 10) {
          memberUidChunks.push(allMemberUids.slice(i, i + 10))
        }
        for (const chunk of memberUidChunks) {
          const chunkSnap = await adminDb
            .collection('pipeline')
            .where('assignedTo', 'in', chunk)
            .get()
          for (const doc of chunkSnap.docs) {
            if (!seen.has(doc.id)) {
              const d = doc.data()
              if (d.archived === true) {
                seen.add(doc.id)
                results.push({ id: doc.id, ...d })
              }
            }
          }
        }
      }

      // Tri par date d'archivage (plus récent en premier)
      results.sort((a: any, b: any) => {
        const ta = a.archivedAt
          ? new Date(a.archivedAt._seconds ? a.archivedAt._seconds * 1000 : a.archivedAt).getTime()
          : 0
        const tb = b.archivedAt
          ? new Date(b.archivedAt._seconds ? b.archivedAt._seconds * 1000 : b.archivedAt).getTime()
          : 0
        return tb - ta
      })

      return NextResponse.json({ items: results, total: results.length })
    }

    // ── ACTIONS : ARCHIVE / RESTORE ────────────────────────────────────────
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Un tableau "ids" non vide est requis.' },
        { status: 400 }
      )
    }
    if (ids.length > 200) {
      return NextResponse.json(
        { message: 'Maximum 200 opportunités par opération.' },
        { status: 400 }
      )
    }

    const successes: string[] = []
    const skipped: string[] = []
    const skippedReasons: Record<string, string> = {}
    const errors: string[] = []

    const batch = adminDb.batch()

    for (const id of ids) {
      try {
        const docRef = adminDb.collection('pipeline').doc(id)
        const docSnap = await docRef.get()

        if (!docSnap.exists) {
          skipped.push(id)
          skippedReasons[id] = 'not_found'
          continue
        }

        const data = docSnap.data()!

        // Vérification tenant : le lead doit appartenir à ce TM ou à un de ses commerciaux
        const belongsToManager =
          data.managerUid === callerUid ||
          data.userId === callerUid ||
          data.assignedTo === callerUid ||
          (data.assignedTo && memberUids.has(data.assignedTo)) ||
          (data.userId && memberUids.has(data.userId))
        if (!belongsToManager) {
          skipped.push(id)
          skippedReasons[id] = 'access_denied'
          continue
        }

        if (action === 'archive') {
          // Refus d'archiver un lead conclu
          const status = (data.status || '').toLowerCase()
          if (status === 'conclue' || status === 'conclusion') {
            skipped.push(id)
            skippedReasons[id] = 'concluded'
            continue
          }
          // Refus de ré-archiver un lead déjà archivé
          if (data.archived === true) {
            skipped.push(id)
            skippedReasons[id] = 'already_archived'
            continue
          }

          batch.update(docRef, {
            archived: true,
            archivedAt: new Date(),
            archivedBy: callerUid,
            managerUid: data.managerUid || callerUid
          })
          successes.push(id)
        } else {
          // restore
          batch.update(docRef, {
            archived: false,
            archivedAt: null,
            archivedBy: null
          })
          successes.push(id)
        }
      } catch (err) {
        console.error(`[/api/pipeline/archive] Error processing id=${id}:`, err)
        errors.push(id)
      }
    }

    if (successes.length > 0) {
      await batch.commit()

      // Propagation temps réel vers le Senior Manager après archivage/restauration.
      const callerOrgCode = (userData.orgCode as string) || undefined
      if (callerOrgCode) {
        adminDb
          .collection('organisations')
          .doc(callerOrgCode)
          .update({ lastPipelineUpdate: new Date().toISOString() })
          .catch((orgErr: unknown) => {
            console.warn('[pipeline/archive] lastPipelineUpdate write failed:', orgErr)
          })
      }
    }

    return NextResponse.json({
      success: true,
      action,
      archived: successes.length,
      skipped: skipped.length,
      errors: errors.length,
      ids: successes
    })

  } catch (error) {
    console.error('[/api/pipeline/archive] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
