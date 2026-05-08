export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const doc = await adminDb.collection('users').doc(decoded.uid).get()
  if (doc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)

    // Fetch all companies
    const snap = await adminDb.collection('companies').orderBy('createdAt', 'desc').get()
    const companies = snap.docs.map(doc => doc.data())

    // Define CSV Headers according to requested format
    // N°, RAISON_SOCIALE, SIGLE, NIU, SECTEUR D'ACTIVITE, REGIME, REGION, VILLE
    const headers = [
      'N°',
      'RAISON_SOCIALE',
      'SIGLE',
      'NIU',
      "SECTEUR D'ACTIVITE",
      'REGIME',
      'REGION',
      'VILLE',
      'TELEPHONE',
      'EMAIL'
    ]

    const csvRows = companies.map((c, index) => {
      const row = [
        index + 1,
        c.raisonSociale || '',
        c.sigle || '',
        c.niu || '',
        c.sector || '',
        c.regime || '',
        c.region || '',
        c.city || '',
        c.telephone || '',
        c.email || ''
      ]
      
      // Escape commas and quotes for CSV
      return row.map(val => {
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }).join(',')
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')

    // Return CSV as a download
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="entreprises_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Export GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

