export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { invalidateCompanyCache } from '@/lib/company-search'
import {
  deleteAllSupabaseCompanies,
  getSupabaseCompaniesPage,
  supabaseCompanyToAppRecord
} from '@/lib/supabase-companies'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    try {
      await verifyAdminCached(token)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'unauthenticated')
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10))
    )

    const result = await getSupabaseCompaniesPage({
      limit: pageSize,
      offset: (page - 1) * pageSize
    })

    return NextResponse.json({
      items: result.companies.map(supabaseCompanyToAppRecord),
      total: result.total,
      page,
      pageSize
    })
  } catch (error) {
    console.error('Companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    try {
      await verifyAdminCached(token)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'unauthenticated')
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await deleteAllSupabaseCompanies()
    await invalidateCompanyCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete all companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
