export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch all companies
    const snap = await adminDb.collection('companies').get()
    const companies = snap.docs.map((doc) => doc.data())

    // Calculate statistics
    const bySector: Record<string, number> = {}
    const byRegion: Record<string, number> = {}
    
    companies.forEach((company: any) => {
      const sector = company.sector || 'Non spécifié'
      const region = company.city || 'Non spécifiée'
      
      bySector[sector] = (bySector[sector] || 0) + 1
      byRegion[region] = (byRegion[region] || 0) + 1
    })

    return NextResponse.json({
      bySector: Object.entries(bySector)
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count),
      byRegion: Object.entries(byRegion)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count),
      total: companies.length,
    })
  } catch (error) {
    console.error('Company stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

