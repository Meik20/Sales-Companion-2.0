export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/clients
 * Récupère les clients de la "Base de données clients" pour le Team Manager ou Senior Manager.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data()
    if (!userData) return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })

    // Contrôle d'accès : Manager, Admin, ou Member
    if (!['manager', 'admin', 'member'].includes(userData.role)) {
      return NextResponse.json({ message: 'Accès réservé aux managers et administrateurs' }, { status: 403 })
    }

    if (userData.role === 'manager' && !hasActivePaidManagerAccess(userData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const assignedFilter = url.searchParams.get('assignedTo')
    const searchQuery = url.searchParams.get('q')?.toLowerCase().trim()
    const viewOrg = url.searchParams.get('org') === 'true'

    let queryRef = adminDb.collection('clients') as any

    if (userData.role === 'admin') {
      // Admin global
      queryRef = queryRef.limit(500)
    } else if (userData.role === 'manager') {
      if (userData.orgRole === 'senior_manager' && viewOrg && userData.orgCode) {
        // Vue consolidée organisation du Senior Manager
        queryRef = queryRef.where('orgCode', '==', userData.orgCode).limit(1000)
      } else {
        // Vue Team Manager : ses clients
        queryRef = queryRef.where('managerUid', '==', uid).limit(1000)
      }
    } else if (userData.role === 'member') {
      // Membre terrain : ses propres ventes conclues
      queryRef = queryRef.where('assignedTo', '==', uid).limit(500)
    }

    const snap = await queryRef.get()
    let clients: any[] = []

    snap.docs.forEach((doc: any) => {
      const d = doc.data()
      clients.push({
        id: doc.id,
        ...d,
        concludedAt: d.concludedAt?.toDate?.()?.toISOString() ?? (typeof d.concludedAt === 'string' ? d.concludedAt : null),
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (typeof d.createdAt === 'string' ? d.createdAt : null),
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? (typeof d.updatedAt === 'string' ? d.updatedAt : null)
      })
    })

    // Filtre par membre assigné
    if (assignedFilter) {
      clients = clients.filter((c) => c.assignedTo === assignedFilter)
    }

    // Filtre par recherche textuelle
    if (searchQuery) {
      clients = clients.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(searchQuery) ||
          c.contactName?.toLowerCase().includes(searchQuery) ||
          c.companyCity?.toLowerCase().includes(searchQuery) ||
          c.companySector?.toLowerCase().includes(searchQuery) ||
          c.assignedName?.toLowerCase().includes(searchQuery) ||
          c.companyPhone?.includes(searchQuery)
      )
    }

    // Tri du plus récent au plus ancien
    clients.sort((a, b) => {
      const dateA = a.concludedAt ? new Date(a.concludedAt).getTime() : 0
      const dateB = b.concludedAt ? new Date(b.concludedAt).getTime() : 0
      return dateB - dateA
    })

    // Calcul de statistiques rapides
    const totalAmount = clients.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

    return NextResponse.json({
      clients,
      total: clients.length,
      totalAmount
    })
  } catch (error) {
    console.error('[clients GET]', error)
    return NextResponse.json({ message: 'Erreur serveur lors de la récupération des clients' }, { status: 500 })
  }
}

/**
 * POST /api/clients
 * Création manuelle d'un client dans la base clients par le manager.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data()
    if (!userData || !['manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ message: 'Accès réservé aux managers' }, { status: 403 })
    }

    if (userData.role === 'manager' && !hasActivePaidManagerAccess(userData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      companyName,
      contactName,
      companyPhone,
      companyEmail,
      companyCity,
      companySector,
      address,
      amount,
      currency,
      notes,
      assignedTo
    } = body

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ message: 'Le nom de l’entreprise est requis' }, { status: 400 })
    }

    // Récupérer les informations du commercial assigné si spécifié
    let assignedName: string | null = null
    let assignedEmail: string | null = null
    let assignedRole = 'member'

    if (assignedTo) {
      try {
        const assignedDoc = await adminDb.collection('users').doc(assignedTo).get()
        if (assignedDoc.exists) {
          const aData = assignedDoc.data() || {}
          assignedName = aData.name || aData.displayName || aData.email || 'Commercial'
          assignedEmail = aData.email || null
          assignedRole = aData.role || 'member'
        }
      } catch (e) {
        console.warn('[clients POST] Erreur profil commercial:', e)
      }
    } else {
      assignedName = userData.name || userData.displayName || 'Manager'
      assignedEmail = userData.email || null
    }

    const now = Timestamp.now()
    const clientData: Record<string, any> = {
      companyName: companyName.trim(),
      contactName: (contactName || '').trim(),
      companyPhone: (companyPhone || '').trim(),
      companyEmail: (companyEmail || '').trim(),
      companyCity: (companyCity || '').trim(),
      companySector: (companySector || '').trim(),
      address: (address || '').trim(),
      country: userData.country || 'Cameroun',
      amount: amount != null ? Number(amount) : null,
      currency: currency || 'XAF',
      notes: (notes || '').trim(),
      status: 'active',
      assignedTo: assignedTo || uid,
      assignedName,
      assignedEmail,
      assignedRole,
      managerUid: uid,
      orgCode: userData.orgCode || null,
      concludedAt: now,
      createdAt: now,
      updatedAt: now,
      dismissedBySupportAgents: []
    }

    const ref = await adminDb.collection('clients').add(clientData)

    return NextResponse.json({
      id: ref.id,
      ...clientData,
      concludedAt: now.toDate().toISOString(),
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    })
  } catch (error) {
    console.error('[clients POST]', error)
    return NextResponse.json({ message: 'Erreur lors de la création du client' }, { status: 500 })
  }
}
