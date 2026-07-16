import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

// ── GET /api/imports — Liste les prospects du manager ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    const assignedTo = searchParams.get('assignedTo') // optionnel

    if (!managerId) {
      return NextResponse.json({ message: 'managerId requis' }, { status: 400 })
    }

    // Query simplifiée : where seulement (pas d'orderBy pour éviter les composite indexes)
    const q = adminDb
      .collection('manager_prospects')
      .where('managerId', '==', managerId)
      .limit(3000)

    const snap = await q.get()

    // Tri et filtrage côté app
    let prospects = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      }
    })

    // Trier par createdAt (descendant)
    prospects.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return bTime - aTime
    })

    // Filtrage optionnel par assigné
    const filtered = assignedTo
      ? prospects.filter((p: Record<string, unknown>) => p.assignedTo === assignedTo)
      : prospects

    return NextResponse.json({ prospects: filtered })
  } catch (error) {
    console.error('[imports GET] Error fetching prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    console.error('[imports GET] Error details:', { message: msg, error })
    return NextResponse.json({ message: 'Erreur serveur', details: msg }, { status: 500 })
  }
}

// ── POST /api/imports — Importer des prospects depuis un CSV parsé ────
export async function POST(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()

    // ── Authentification obligatoire ───────────────────────────────────────
    const { adminAuth } = await import('@/lib/firebase-admin')
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Vérifier le rôle : seul manager ou support_agent peut importer
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    const callerRole = callerData?.role as string | undefined

    if (!['manager', 'support_agent'].includes(callerRole ?? '')) {
      return NextResponse.json(
        { message: 'Accès refusé. Seul un manager ou un agent support peut importer des prospects.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })
    }

    const { managerId, prospects } = body as {
      managerId?: string
      prospects?: Array<{
        name?: string
        phone?: string
        email?: string
        city?: string
        sector?: string
        notes?: string
        assignedTo?: string
      }>
    }

    if (!managerId || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json(
        { message: 'managerId et une liste de prospects sont requis' },
        { status: 400 }
      )
    }

    // Sécurité : un support_agent ne peut importer que sous le managerId de son manager lié
    if (callerRole === 'support_agent') {
      const linkedManagerUids: string[] = callerData?.linkedManagerUids ?? []
      if (!linkedManagerUids.includes(managerId)) {
        return NextResponse.json(
          { message: 'Accès refusé. Vous ne pouvez importer que pour votre manager lié.' },
          { status: 403 }
        )
      }
    }

    // Sécurité : un manager ne peut importer que sous son propre uid
    if (callerRole === 'manager' && managerId !== callerUid) {
      return NextResponse.json(
        { message: 'Accès refusé. Vous ne pouvez importer que pour votre propre compte.' },
        { status: 403 }
      )
    }

    if (prospects.length > 3000) {
      return NextResponse.json({ message: 'Maximum 3000 prospects par import' }, { status: 400 })
    }

    // Écriture en multi-batch Firestore (limite Firestore = 500 writes par batch)
    let importedCount = 0
    let currentBatch = adminDb.batch()
    let batchOps = 0
    const colRef = adminDb.collection('manager_prospects')
    const now = new Date()

    const flush = async () => {
      if (batchOps > 0) {
        await currentBatch.commit()
        currentBatch = adminDb.batch()
        batchOps = 0
      }
    }

    for (const p of prospects) {
      const ref = colRef.doc()
      currentBatch.set(ref, {
        managerId,
        name: (p.name ?? '').trim(),
        phone: (p.phone ?? '').trim(),
        email: (p.email ?? '').trim(),
        city: (p.city ?? '').trim(),
        sector: (p.sector ?? '').trim(),
        notes: (p.notes ?? '').trim(),
        assignedTo: p.assignedTo ?? null,
        importedBy: callerUid,      // traçabilité : qui a fait l'import
        importedByRole: callerRole, // traçabilité : quel rôle
        status: 'new',
        createdAt: now,
        updatedAt: now
      })
      batchOps++
      importedCount++
      if (batchOps >= 499) await flush()
    }
    await flush()

    return NextResponse.json({ success: true, count: importedCount })
  } catch (error) {
    console.error('[imports POST] Error importing prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    console.error('[imports POST] Error details:', { message: msg, error })
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// ── PATCH /api/imports — Assigner un prospect à un membre ────────────
export async function PATCH(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })
    }

    const { prospectId, assignedTo, managerId } = body as {
      prospectId?: string
      assignedTo?: string | null
      managerId?: string
    }

    if (!prospectId || !managerId) {
      return NextResponse.json({ message: 'prospectId et managerId requis' }, { status: 400 })
    }

    const ref = adminDb.collection('manager_prospects').doc(prospectId)
    const snap = await ref.get()

    if (!snap.exists || snap.data()?.managerId !== managerId) {
      return NextResponse.json({ message: 'Prospect non trouvé ou accès refusé' }, { status: 403 })
    }

    await ref.update({ assignedTo: assignedTo ?? null, updatedAt: new Date() })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[imports PATCH] Error updating prospect:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    console.error('[imports PATCH] Error details:', { message: msg, error })
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
