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

    let q = adminDb
      .collection('manager_prospects')
      .where('managerId', '==', managerId)
      .orderBy('createdAt', 'desc')
      .limit(200)

    const snap = await q.get()
    const prospects = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Filtrage optionnel par assigné
    const filtered = assignedTo
      ? prospects.filter((p: Record<string, unknown>) => p.assignedTo === assignedTo)
      : prospects

    return NextResponse.json({ prospects: filtered })
  } catch (error) {
    console.error('[imports GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST /api/imports — Importer des prospects depuis un CSV parsé ────
export async function POST(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
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

    if (prospects.length > 500) {
      return NextResponse.json(
        { message: 'Maximum 500 prospects par import' },
        { status: 400 }
      )
    }

    // Écriture en batch Firestore
    const batch = adminDb.batch()
    const colRef = adminDb.collection('manager_prospects')
    const now = new Date()

    for (const p of prospects) {
      const ref = colRef.doc()
      batch.set(ref, {
        managerId,
        name:       (p.name       ?? '').trim(),
        phone:      (p.phone      ?? '').trim(),
        email:      (p.email      ?? '').trim(),
        city:       (p.city       ?? '').trim(),
        sector:     (p.sector     ?? '').trim(),
        notes:      (p.notes      ?? '').trim(),
        assignedTo: p.assignedTo ?? null,
        status:     'new',
        createdAt:  now,
        updatedAt:  now,
      })
    }

    await batch.commit()

    return NextResponse.json({ success: true, count: prospects.length })
  } catch (error) {
    console.error('[imports POST]', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur'
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
    console.error('[imports PATCH]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
