export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import {
  hasCrossCountryAccess,
  CROSS_COUNTRY_ERROR_CODE,
  CROSS_COUNTRY_ERROR_MESSAGE
} from '@/lib/cross-country'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/pipeline/add
 * Ajoute une entreprise au pipeline de l'utilisateur (via Firebase Admin SDK).
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    // Auth check
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let userId: string
    let decodedToken: any
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
      userId = decodedToken.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const callerDoc = await adminDb.collection('users').doc(userId).get()
    const callerData = callerDoc.data()

    // Membres activés via invitation manageur : ils n'ont pas de flux email-verification.
    // Leur `activated: true` ou `active: true` est l'équivalent fonctionnel de la vérification email.
    const isMemberByInvitation =
      callerData?.role === 'member' && (callerData?.activated === true || callerData?.active === true)
    const isEmailVerified = Boolean(callerData?.emailVerified || decodedToken.email_verified)

    if (
      !callerData ||
      callerData.active !== true ||
      (!isMemberByInvitation && !isEmailVerified)
    ) {
      return NextResponse.json(
        { message: 'Un compte actif et vérifié est requis.' },
        { status: 403 }
      )
    }
    if (callerData.role === 'manager' && !hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif est requis.' },
        { status: 403 }
      )
    }
    if (!['manager', 'independent', 'member'].includes(callerData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })
    }

    const {
      companyId,
      companyName,
      companySector,
      companyCity,
      companyRegion,
      companyQuarter,
      companyPhone,
      companyEmail,
      companyCountry,
      country,
      googlePlaceId,
      status,
      amount,
      currency,
      note,
      nextAction,
      nextDate
    } = body as {
      companyId?: string
      companyName?: string
      companySector?: string
      companyCity?: string
      companyRegion?: string
      companyQuarter?: string
      companyPhone?: string
      companyEmail?: string
      companyCountry?: string
      country?: string
      googlePlaceId?: string | null
      status?: string
      amount?: number | string | null
      currency?: string | null
      note?: string | null
      nextAction?: string | null
      nextDate?: string | null
    }

    const callerHomeCountry = ((callerData.country as string) || 'CM').toUpperCase().trim()
    const rawTargetCountry = (companyCountry || country || '').toUpperCase().trim()
    const targetCountry = rawTargetCountry || callerHomeCountry

    if (rawTargetCountry && rawTargetCountry !== callerHomeCountry) {
      const hasAccess = hasCrossCountryAccess(callerData)
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'cross_country_restricted',
            code: CROSS_COUNTRY_ERROR_CODE,
            message: CROSS_COUNTRY_ERROR_MESSAGE
          },
          { status: 403 }
        )
      }
    }

    const isManagerRole = callerData.role === 'manager'
    const managerUid = isManagerRole ? userId : (callerData.managerUid as string | null | undefined)
    const assignedTo = isManagerRole ? null : userId
    const memberName = isManagerRole ? null : (callerData.name ?? callerData.displayName ?? null)
    const memberAccessId = isManagerRole ? null : (callerData.accessId ?? null)

    if (!companyName) {
      return NextResponse.json({ message: 'companyName requis' }, { status: 400 })
    }

    let finalPhone = companyPhone
    let finalWebsite = null

    // ── Fetch Google Place Details si googlePlaceId est présent ──
    if (googlePlaceId) {
      const googleApiKey =
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=formatted_phone_number,website&key=${googleApiKey}`
          const gRes = await fetch(url)
          const gData = await gRes.json()
          if (gData.result) {
            if (gData.result.formatted_phone_number && !finalPhone)
              finalPhone = gData.result.formatted_phone_number
            if (gData.result.website) finalWebsite = gData.result.website
          }
        } catch (err) {
          console.error('[pipeline/add] Google Place Details Error:', err)
        }
      }
    }

    const callerOrgCode = (callerData.orgCode as string) || null

    // ── Step: Find previous assignees (Strictement isolé par Organisation / Manager) ──
    const prevAssigneesMap = new Map<
      string,
      { userId: string; memberName: string; assignedAt: string }
    >()
    if (companyId || companyName) {
      try {
        let query = adminDb.collection('pipeline') as FirebaseFirestore.Query
        if (companyId) {
          query = query.where('companyId', '==', companyId)
        } else {
          query = query.where('companyName', '==', companyName)
        }

        if (callerOrgCode) {
          query = query.where('orgCode', '==', callerOrgCode)
        } else if (managerUid) {
          query = query.where('managerUid', '==', managerUid)
        } else {
          query = query.where('userId', '==', userId)
        }

        const snap = await query.get()
        snap.docs.forEach((doc) => {
          const d = doc.data()
          const isManager =
            d.userId === managerUid || d.assignedTo === managerUid || d.role === 'manager'
          if (d.userId && d.userId !== userId && !isManager) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('[pipeline/add] Error fetching previousAssignees', err)
      }
    }
    const previousAssignees = Array.from(prevAssigneesMap.values())

    // Un manager qui ajoute un prospect depuis la recherche:
    //   - userId = managerUid (il est le propriétaire)
    //   - assignedTo = null (pas encore assigné à un membre)
    //   - memberName = null
    // Un member qui ajoute son propre prospect:
    //   - userId = memberId
    //   - assignedTo = memberId (lui-même)
    //   - memberName = son propre nom
    const finalAssignedTo = assignedTo
    const finalMemberName = memberName

    const now = new Date()
    const docRef = await adminDb.collection('pipeline').add({
      userId,
      managerUid: managerUid ?? null,
      orgCode: callerData.orgCode ?? null,
      segment: callerData.segment ?? null,
      seniorManagerUid:
        callerData.seniorManagerUid ||
        (callerData.orgRole === 'senior_manager' ? userId : null),
      assignedTo: finalAssignedTo,
      memberName: finalMemberName,
      memberAccessId: isManagerRole ? null : (memberAccessId ?? null),
      companyId: companyId ?? null,
      country: targetCountry,
      companyCountry: targetCountry,
      originSource: companyId ? 'supabase_directory' : 'manual',
      externalDirectoryId: companyId ?? null,
      companyName: companyName,
      companySector: companySector ?? null,
      companyCity: companyCity ?? null,
      companyRegion: companyRegion ?? null,
      companyQuarter: companyQuarter ?? null,
      region: companyRegion ?? null,
      quarter: companyQuarter ?? null,
      companyPhone: finalPhone ?? null,
      phone: finalPhone ?? null,
      companyEmail: companyEmail ?? null,
      email: companyEmail ?? null,
      companyWebsite: finalWebsite ?? null,
      status: status && ['prospection', 'negociation', 'conclue'].includes(status) ? status : 'prospection',
      amount: typeof amount === 'number' ? amount : (amount ? parseFloat(String(amount)) : null),
      currency: currency || 'FCFA',
      nextAction: nextAction || null,
      nextDate: nextDate || null,
      note: note || '',
      previousAssignees,
      enteredAt: now.toISOString(),
      assignedAt: finalAssignedTo ? now.toISOString() : null,
      createdAt: now,
      updatedAt: now
    })

    // Propagation temps réel vers le Senior Manager :
    // on met à jour lastPipelineUpdate sur le document organisation.
    // Le hook useOrgPipelineRealtimeSync écoute ce champ via onSnapshot
    // et invalide immédiatement le cache org-pipeline côté client SM.
    const orgCode = callerData.orgCode as string | undefined
    if (orgCode) {
      adminDb
        .collection('organisations')
        .doc(orgCode)
        .update({ lastPipelineUpdate: new Date().toISOString() })
        .catch((orgErr: unknown) => {
          // Non bloquant — ne doit pas faire échouer la réponse principale.
          console.warn('[pipeline/add] lastPipelineUpdate write failed:', orgErr)
        })
    }

    // Miroir de sauvegarde confidentiel sur Supabase private_prospects pour délestage des quotas
    try {
      const { isPrivateProspectsTableAvailable, bulkInsertPrivateProspects } = await import(
        '@/lib/supabase-private-prospects'
      )
      const isAvailable = await isPrivateProspectsTableAvailable()
      if (isAvailable) {
        await bulkInsertPrivateProspects([
          {
            id: docRef.id,
            org_code: callerData.orgCode ?? null,
            user_id: userId,
            manager_uid: managerUid ?? null,
            assigned_to: finalAssignedTo ?? null,
            assigned_member_name: finalMemberName ?? null,
            company_name: companyName,
            country_code: targetCountry,
            sector: companySector ?? null,
            city: companyCity ?? null,
            quarter: companyQuarter ?? null,
            region: companyRegion ?? null,
            phone: finalPhone ?? null,
            email: companyEmail ?? null,
            notes: note || null,
            status: status && ['prospection', 'negociation', 'conclue'].includes(status) ? status : 'prospection',
            transfer_deadline: null,
            assignment_deadline: null,
            transferred_to_manager_uid: null,
            transferred_from_senior_uid: null,
            pipeline_entry_id: docRef.id
          }
        ])
      }
    } catch (sbErr) {
      console.warn('[pipeline/add] Non-blocking Supabase sync error:', sbErr)
    }

    return NextResponse.json({ success: true, id: docRef.id })

  } catch (error) {
    console.error('[pipeline/add] Error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
