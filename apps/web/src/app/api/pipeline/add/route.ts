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
    const callerSegment = (callerData.segment as string)?.trim() || null

    // ── VÉRIFICATION CANONIQUE ANTI-DOUBLONS & CANNIBALISME COMMERCIAL ──
    // Règle inviolable : Un prospect ne peut pas être dans le pipeline de deux membres
    // d'une même équipe, ni même du même segment (ni dans les prospects importés du TM).
    if (callerOrgCode && (companyId || companyName)) {
      const activeStatuses = [
        'prospection',
        'negociation',
        'conclue',
        'lead',
        'prospect',
        'negotiation',
        'won',
        'contact',
        'to_contact',
        'in_progress'
      ]

      const candidateDocs: FirebaseFirestore.DocumentSnapshot[] = []
      const seenDocIds = new Set<string>()

      // 1. Recherche dans pipeline par companyId puis par companyName
      const pipelineCol = adminDb.collection('pipeline')
      if (companyId) {
        try {
          const snap = await pipelineCol
            .where('orgCode', '==', callerOrgCode)
            .where('companyId', '==', companyId)
            .get()
          snap.docs.forEach((d) => {
            if (!seenDocIds.has(d.id)) {
              seenDocIds.add(d.id)
              candidateDocs.push(d)
            }
          })
        } catch (err) {
          console.warn('[pipeline/add] pipeline companyId check error:', err)
        }
      }
      if (companyName) {
        try {
          const snap = await pipelineCol
            .where('orgCode', '==', callerOrgCode)
            .where('companyName', '==', companyName)
            .get()
          snap.docs.forEach((d) => {
            if (!seenDocIds.has(d.id)) {
              seenDocIds.add(d.id)
              candidateDocs.push(d)
            }
          })
        } catch (err) {
          console.warn('[pipeline/add] pipeline companyName check error:', err)
        }
      }

      // 2. Recherche dans manager_prospects par companyId puis par companyName
      const managerProspectsCol = adminDb.collection('manager_prospects')
      if (companyId) {
        try {
          const snap = await managerProspectsCol
            .where('orgCode', '==', callerOrgCode)
            .where('companyId', '==', companyId)
            .get()
          snap.docs.forEach((d) => {
            if (!seenDocIds.has(d.id)) {
              seenDocIds.add(d.id)
              candidateDocs.push(d)
            }
          })
        } catch (err) {
          console.warn('[pipeline/add] manager_prospects companyId check error:', err)
        }
      }
      if (companyName) {
        try {
          const snap = await managerProspectsCol
            .where('orgCode', '==', callerOrgCode)
            .where('companyName', '==', companyName)
            .get()
          snap.docs.forEach((d) => {
            if (!seenDocIds.has(d.id)) {
              seenDocIds.add(d.id)
              candidateDocs.push(d)
            }
          })
        } catch (err) {
          console.warn('[pipeline/add] manager_prospects companyName check error:', err)
        }
      }

      // Filtrer les documents en conflit au sein de la même équipe ou du même segment
      let conflictingDoc: FirebaseFirestore.DocumentSnapshot | null = null

      for (const doc of candidateDocs) {
        const dData = doc.data()
        if (!dData) continue

        const itemSegment = (dData.segment as string)?.trim() || null
        const itemManagerUid = (dData.managerUid || dData.managerId) as string | undefined

        // Vérification d'équipe : même Team Manager
        const isSameTeam = Boolean(
          managerUid && itemManagerUid && managerUid.toLowerCase() === itemManagerUid.toLowerCase()
        )

        // Vérification de segment : même segment d'activité (ou segment non défini pour les deux)
        const isSameSegment = Boolean(
          (callerSegment && itemSegment && callerSegment.toLowerCase() === itemSegment.toLowerCase()) ||
          (!callerSegment && !itemSegment)
        )

        if (isSameTeam || isSameSegment) {
          const itemStatus = String(dData.status || 'prospection').toLowerCase().trim()
          const isFromPipeline = doc.ref.parent.id === 'pipeline'

          if (isFromPipeline) {
            if (activeStatuses.includes(itemStatus) || !dData.status) {
              conflictingDoc = doc
              break
            }
          } else {
            // manager_prospects
            if (itemStatus !== 'archived' && itemStatus !== 'rejected') {
              conflictingDoc = doc
              break
            }
          }
        }
      }

      if (conflictingDoc) {
        const cData = conflictingDoc.data() || {}
        const isFromPipeline = conflictingDoc.ref.parent.id === 'pipeline'
        const cTmUid = (cData.managerUid || cData.managerId || null) as string | null
        const cAssignedTo = (cData.assignedTo || null) as string | null

        // Résolution Règle 13 : Noms humains côté serveur, jamais d'identifiants bruts
        let resolvedTmName = (cData.managerName as string | null) || null
        if (cTmUid) {
          try {
            const tmSnap = await adminDb.collection('users').doc(cTmUid).get()
            if (tmSnap.exists) {
              const u = tmSnap.data()
              resolvedTmName = u?.displayName || u?.name || u?.email || 'Team Manager'
            }
          } catch (err) {
            console.warn('[pipeline/add] Erreur résolution nom TM:', err)
          }
        }
        if (!resolvedTmName) {
          resolvedTmName = 'Team Manager'
        }

        let resolvedMemberName = (cData.memberName as string | null) || null
        if (cAssignedTo && cAssignedTo !== cTmUid) {
          if (!resolvedMemberName) {
            try {
              const memSnap = await adminDb.collection('users').doc(cAssignedTo).get()
              if (memSnap.exists) {
                const u = memSnap.data()
                resolvedMemberName = u?.displayName || u?.name || u?.email || 'Commercial'
              }
            } catch (err) {
              console.warn('[pipeline/add] Erreur résolution nom commercial:', err)
            }
          }
          if (!resolvedMemberName) {
            resolvedMemberName = 'Commercial'
          }
        } else {
          // Prospect non assigné à un commercial : sous la responsabilité directe du TM
          resolvedMemberName = null
        }

        const isSameUser = Boolean(
          cData.userId === userId ||
          cData.assignedTo === userId ||
          (isManagerRole && (cData.managerId === userId || cData.managerUid === userId))
        )

        const conflictStatus = isFromPipeline
          ? (cData.status || 'prospection')
          : (cData.status === 'assigned' ? 'assigned' : 'new')

        return NextResponse.json(
          {
            error: 'prospect_already_assigned',
            code: 'PROSPECT_ALREADY_EXISTS_IN_SEGMENT',
            message: isSameUser
              ? 'Vous suivez déjà ce prospect dans votre portefeuille.'
              : 'Ce prospect est déjà pris en charge dans votre équipe ou votre segment.',
            conflict: {
              companyName: cData.companyName || cData.name || companyName,
              status: conflictStatus,
              teamManagerName: resolvedTmName,
              teamManagerUid: cTmUid,
              assignedMemberName: resolvedMemberName,
              assignedMemberUid: cAssignedTo,
              segment: cData.segment || callerSegment || null,
              isSameTeam: Boolean(cTmUid && managerUid && cTmUid === managerUid),
              isSameUser,
              isFromManagerProspects: !isFromPipeline,
              updatedAt:
                cData.updatedAt?.toDate?.()?.toISOString() ||
                cData.createdAt?.toDate?.()?.toISOString() ||
                null
            }
          },
          { status: 409 }
        )
      }
    }

    // Pour les indépendants (hors organisation) : vérification sur leur propre pipeline
    if (!callerOrgCode && (companyId || companyName)) {
      try {
        let query = adminDb.collection('pipeline').where('userId', '==', userId)
        if (companyId) {
          query = query.where('companyId', '==', companyId)
        } else {
          query = query.where('companyName', '==', companyName)
        }
        const snap = await query.get()
        const firstDoc = snap.docs?.[0]
        if (firstDoc) {
          const dData = firstDoc.data()
          return NextResponse.json(
            {
              error: 'prospect_already_assigned',
              code: 'PROSPECT_ALREADY_EXISTS_IN_SEGMENT',
              message: 'Vous suivez déjà ce prospect dans votre pipeline.',
              conflict: {
                companyName: dData.companyName || dData.name || companyName,
                status: dData.status || 'prospection',
                teamManagerName: null,
                teamManagerUid: null,
                assignedMemberName: callerData.name || callerData.displayName || 'Vous-même',
                assignedMemberUid: userId,
                segment: null,
                isSameTeam: true,
                isSameUser: true,
                isFromManagerProspects: false,
                updatedAt: dData.updatedAt?.toDate?.()?.toISOString() || null
              }
            },
            { status: 409 }
          )
        }
      } catch (indErr) {
        console.warn('[pipeline/add] independent duplicate check error:', indErr)
      }
    }

    // ── Step: Find previous assignees (Historique des anciens commerciaux ayant traité ce prospect) ──
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

    // ── RÈGLE ARCHITECTURALE CANONIQUE ──
    // Un manager qui ajoute un prospect depuis la recherche ou le formulaire :
    // Le prospect est stocké dans "Mes prospects importés" (manager_prospects)
    // en attente d'être assigné à un commercial de terrain. Il ne pollue pas le pipeline actif.
    if (isManagerRole) {
      const docRef = await adminDb.collection('manager_prospects').add({
        managerId: userId,
        orgCode: callerData.orgCode ?? null,
        segment: callerData.segment ?? null,
        seniorManagerUid:
          callerData.seniorManagerUid ||
          (callerData.orgRole === 'senior_manager' ? userId : null),
        name: companyName,
        companyName: companyName,
        companyId: companyId ?? null,
        originSource: companyId ? 'supabase_directory' : 'manual',
        externalDirectoryId: companyId ?? null,
        phone: finalPhone ?? null,
        email: companyEmail ?? null,
        city: companyCity ?? null,
        sector: companySector ?? null,
        region: companyRegion ?? null,
        quarter: companyQuarter ?? null,
        country: targetCountry,
        notes: note || '',
        status: 'new',
        assignedTo: null,
        importedBy: userId,
        importedByRole: callerData.role,
        createdAt: now,
        updatedAt: now
      })

      // Propagation temps réel
      const orgCode = callerData.orgCode as string | undefined
      if (orgCode) {
        adminDb
          .collection('organisations')
          .doc(orgCode)
          .update({
            lastImportsUpdate: now.toISOString(),
            lastPipelineUpdate: now.toISOString()
          })
          .catch((orgErr: unknown) => {
            console.warn('[pipeline/add] lastImportsUpdate write failed:', orgErr)
          })
      }

      // Miroir de sauvegarde confidentiel sur Supabase private_prospects
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
              manager_uid: userId,
              assigned_to: null,
              assigned_member_name: null,
              company_name: companyName,
              country_code: targetCountry,
              sector: companySector ?? null,
              city: companyCity ?? null,
              quarter: companyQuarter ?? null,
              region: companyRegion ?? null,
              phone: finalPhone ?? null,
              email: companyEmail ?? null,
              notes: note || null,
              status: 'new',
              transfer_deadline: null,
              assignment_deadline: null,
              transferred_to_manager_uid: null,
              transferred_from_senior_uid: null,
              pipeline_entry_id: null
            }
          ])
        }
      } catch (sbErr) {
        console.warn('[pipeline/add] Non-blocking Supabase sync error:', sbErr)
      }

      return NextResponse.json({ success: true, id: docRef.id, target: 'imports' })
    }

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
