export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/pipeline/archive
 *
 * Corpus d'actions pour la gestion des archives du pipeline (Team Manager only).
 *
 * Body: { action: 'archive', ids: string[] }           → archive une sélection de leads
 *       { action: 'restore', ids: string[] }            → restaure une sélection de leads
 *       { action: 'list' }                              → retourne tous les leads archivés du manager
 *
 * Règles :
 * - Seul un utilisateur avec role='manager' peut opérer.
 * - Seuls les leads liés à managerUid du manager appelant sont accessibles.
 * - Les leads avec status='conclue'|'conclusion' ne peuvent pas être archivés.
 * - Les champs `archived` et `archivedAt` ne sont JAMAIS écrits côté client.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // ── Auth ──────────────────────────────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    let userRole: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
      userRole = (decoded.role as string) || ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // ── Vérification du rôle manager ──────────────────────────────────────
    if (userRole !== 'manager') {
      // Fallback : lire le document utilisateur si le claim n'est pas encore propagé
      const userDoc = await adminDb.collection('users').doc(managerUid).get()
      if (!userDoc.exists || userDoc.data()?.role !== 'manager') {
        return NextResponse.json(
          { message: 'Accès réservé aux Team Managers.' },
          { status: 403 }
        )
      }
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

    // ── ACTION : LIST ─────────────────────────────────────────────────────
    if (action === 'list') {
      // Leads archivés pour ce manager (managerUid OU userId = managerUid)
      const [teamSnap, ownSnap] = await Promise.all([
        adminDb
          .collection('pipeline')
          .where('managerUid', '==', managerUid)
          .where('archived', '==', true)
          .get(),
        adminDb
          .collection('pipeline')
          .where('userId', '==', managerUid)
          .where('archived', '==', true)
          .get()
      ])

      const seen = new Set<string>()
      const results: Record<string, unknown>[] = []

      for (const snap of [teamSnap, ownSnap]) {
        for (const doc of snap.docs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id)
            results.push({ id: doc.id, ...doc.data() })
          }
        }
      }

      // Tri par date d'archivage (plus récent en premier)
      results.sort((a: any, b: any) => {
        const ta = a.archivedAt ? new Date(a.archivedAt._seconds ? a.archivedAt._seconds * 1000 : a.archivedAt).getTime() : 0
        const tb = b.archivedAt ? new Date(b.archivedAt._seconds ? b.archivedAt._seconds * 1000 : b.archivedAt).getTime() : 0
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
        { message: 'Maximum 200 leads par opération.' },
        { status: 400 }
      )
    }

    const successes: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    // Traitement par lot (Firestore batch = max 500 ops)
    const batch = adminDb.batch()

    for (const id of ids) {
      try {
        const docRef = adminDb.collection('pipeline').doc(id)
        const docSnap = await docRef.get()

        if (!docSnap.exists) {
          skipped.push(id)
          continue
        }

        const data = docSnap.data()!

        // Vérification tenant : le lead doit appartenir à ce manager
        const belongsToManager =
          data.managerUid === managerUid || data.userId === managerUid
        if (!belongsToManager) {
          skipped.push(id)
          continue
        }

        if (action === 'archive') {
          // Refus d'archiver un lead conclu
          const status = (data.status || '').toLowerCase()
          if (status === 'conclue' || status === 'conclusion') {
            skipped.push(id)
            continue
          }

          batch.update(docRef, {
            archived: true,
            archivedAt: new Date(),
            archivedBy: managerUid
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
      } catch {
        errors.push(id)
      }
    }

    if (successes.length > 0) {
      await batch.commit()
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
