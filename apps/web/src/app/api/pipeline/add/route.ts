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

    function normalizeCompanyName(str: unknown): string {
      return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function normalizePhoneDigits(phone: unknown): string {
      const digits = String(phone || '').replace(/\D/g, '')
      return digits.length >= 8 ? digits.slice(-9) : ''
    }

    const phoneToTest = finalPhone || companyPhone || null
    const targetNormalizedName = normalizeCompanyName(companyName)
    const targetPhoneDigits = normalizePhoneDigits(phoneToTest)

    // ── VÉRIFICATION CANONIQUE ANTI-DOUBLONS & CANNIBALISME COMMERCIAL ──
    // Règle inviolable : Un prospect ne peut pas être dans le pipeline de deux membres
    // d'une même équipe, ni même du même segment (ni dans les prospects importés du TM,
    // ni dans la base des clients déjà conclus).
    if (callerOrgCode && (companyId || companyName || phoneToTest)) {
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

      const registerCandidateDoc = (d: FirebaseFirestore.DocumentSnapshot) => {
        if (!seenDocIds.has(d.id)) {
          seenDocIds.add(d.id)
          candidateDocs.push(d)
        }
      }

      // 1. Requêtes ciblées indexées sur 'pipeline'
      const pipelineCol = adminDb.collection('pipeline')
      const pipelinePromises: Promise<any>[] = []

      if (companyId) {
        pipelinePromises.push(
          pipelineCol.where('orgCode', '==', callerOrgCode).where('companyId', '==', companyId).get().catch(() => null)
        )
      }
      if (companyName) {
        pipelinePromises.push(
          pipelineCol.where('orgCode', '==', callerOrgCode).where('companyName', '==', companyName).get().catch(() => null),
          pipelineCol.where('orgCode', '==', callerOrgCode).where('name', '==', companyName).get().catch(() => null)
        )
      }
      if (phoneToTest) {
        pipelinePromises.push(
          pipelineCol.where('orgCode', '==', callerOrgCode).where('companyPhone', '==', phoneToTest).get().catch(() => null),
          pipelineCol.where('orgCode', '==', callerOrgCode).where('phone', '==', phoneToTest).get().catch(() => null)
        )
      }

      // 2. Requêtes ciblées indexées sur 'manager_prospects'
      const managerProspectsCol = adminDb.collection('manager_prospects')
      const mpPromises: Promise<any>[] = []

      if (companyId) {
        mpPromises.push(
          managerProspectsCol.where('orgCode', '==', callerOrgCode).where('companyId', '==', companyId).get().catch(() => null)
        )
      }
      if (companyName) {
        mpPromises.push(
          managerProspectsCol.where('orgCode', '==', callerOrgCode).where('companyName', '==', companyName).get().catch(() => null),
          managerProspectsCol.where('orgCode', '==', callerOrgCode).where('name', '==', companyName).get().catch(() => null)
        )
      }
      if (phoneToTest) {
        mpPromises.push(
          managerProspectsCol.where('orgCode', '==', callerOrgCode).where('phone', '==', phoneToTest).get().catch(() => null)
        )
      }

      // 3. Requêtes ciblées indexées sur 'clients' (clients déjà conclus)
      const clientsCol = adminDb.collection('clients')
      const clientsPromises: Promise<any>[] = []

      if (companyId) {
        clientsPromises.push(
          clientsCol.where('orgCode', '==', callerOrgCode).where('companyId', '==', companyId).get().catch(() => null)
        )
      }
      if (companyName) {
        clientsPromises.push(
          clientsCol.where('orgCode', '==', callerOrgCode).where('companyName', '==', companyName).get().catch(() => null),
          clientsCol.where('orgCode', '==', callerOrgCode).where('name', '==', companyName).get().catch(() => null)
        )
      }
      if (phoneToTest) {
        clientsPromises.push(
          clientsCol.where('orgCode', '==', callerOrgCode).where('phone', '==', phoneToTest).get().catch(() => null)
        )
      }

      // 4. Balayage élargi avec normalisation insensible à la casse / accents / espaces
      const broadPipelinePromise = pipelineCol.where('orgCode', '==', callerOrgCode).limit(300).get().catch(() => null)
      const broadMpPromise = managerProspectsCol.where('orgCode', '==', callerOrgCode).limit(200).get().catch(() => null)
      const broadClientsPromise = clientsCol.where('orgCode', '==', callerOrgCode).limit(200).get().catch(() => null)

      const allSnaps = await Promise.all([
        ...pipelinePromises,
        ...mpPromises,
        ...clientsPromises,
        broadPipelinePromise,
        broadMpPromise,
        broadClientsPromise
      ])

      for (const snap of allSnaps) {
        if (snap && Array.isArray(snap.docs)) {
          snap.docs.forEach(registerCandidateDoc)
        }
      }

      // Filtrer les documents en conflit au sein de la même équipe ou du même segment
      let conflictingDoc: FirebaseFirestore.DocumentSnapshot | null = null
      let conflictingItemSegment: string | null = null
      const managerSegmentCache = new Map<string, string | null>()

      for (const doc of candidateDocs) {
        const dData = doc.data()
        if (!dData) continue

        const itemCompanyId = (dData.companyId || dData.externalDirectoryId || null) as string | null
        const itemDocName = (dData.companyName || dData.name || '') as string
        const itemNormalizedName = normalizeCompanyName(itemDocName)
        const itemPhone = (dData.companyPhone || dData.phone || dData.telephone || '') as string
        const itemPhoneDigits = normalizePhoneDigits(itemPhone)

        // Identification stricte de l'entreprise : ID, Nom normalisé ou Téléphone normalisé
        const isExactId = Boolean(companyId && itemCompanyId && companyId === itemCompanyId)
        const isExactName = Boolean(
          targetNormalizedName &&
          itemNormalizedName &&
          (targetNormalizedName === itemNormalizedName ||
            (targetNormalizedName.length >= 5 &&
              itemNormalizedName.length >= 5 &&
              (targetNormalizedName.includes(itemNormalizedName) || itemNormalizedName.includes(targetNormalizedName))))
        )
        const isSamePhone = Boolean(
          targetPhoneDigits &&
          itemPhoneDigits &&
          targetPhoneDigits === itemPhoneDigits
        )

        if (!isExactId && !isExactName && !isSamePhone) {
          continue
        }

        const colName = doc.ref.parent.id
        const itemStatus = String(
          dData.status || (colName === 'clients' ? 'conclue' : 'prospection')
        ).toLowerCase().trim()

        const isConcluded =
          itemStatus === 'conclue' ||
          itemStatus === 'won' ||
          itemStatus === 'conclusion' ||
          colName === 'clients'

        // RÈGLE ABSOLUE 1 : Si l'entreprise est DÉJÀ CONCLUE (client actif ou conclu dans le pipeline/CRM),
        // c'est un conflit bloquant pour TOUTE l'organisation (anti-cannibalisme de clients existants).
        if (isConcluded) {
          conflictingDoc = doc
          break
        }

        // RÈGLE 2 : Pour les dossiers en cours (prospection, négociation, ou file d'attente manager_prospects),
        // interdiction d'avoir le prospect dans deux membres d'une même équipe ou d'un même segment.
        let itemSegment = (dData.segment as string)?.trim() || null
        const itemManagerUid = (dData.managerUid || dData.managerId) as string | undefined

        // Résolution dynamique du segment depuis le profil manager si absent du document
        if (!itemSegment && itemManagerUid) {
          if (managerSegmentCache.has(itemManagerUid)) {
            itemSegment = managerSegmentCache.get(itemManagerUid) || null
          } else {
            try {
              const mgrSnap = await adminDb.collection('users').doc(itemManagerUid).get()
              const seg = (mgrSnap.data()?.segment as string)?.trim() || null
              managerSegmentCache.set(itemManagerUid, seg)
              itemSegment = seg
            } catch {
              managerSegmentCache.set(itemManagerUid, null)
            }
          }
        }

        // Même équipe (même Team Manager)
        const isSameTeam = Boolean(
          managerUid && itemManagerUid && managerUid.toLowerCase() === itemManagerUid.toLowerCase()
        )

        // Règle d'isolation par segment :
        // Deux dossiers sont considérés comme dans des segments différents UNIQUEMENT SI les deux
        // segments sont définis, non vides ET différents (ex: 'Nord' vs 'Sud').
        // Si l'un ou les deux segments sont non renseignés (vivier commun d'organisation),
        // ou si les deux segments correspondent, il y a conflit bloquant au sein de l'organisation.
        const isDifferentSegment = Boolean(
          callerSegment && itemSegment && callerSegment.toLowerCase() !== itemSegment.toLowerCase()
        )
        const isSameSegment = !isDifferentSegment

        if (isSameTeam || isSameSegment) {
          if (colName === 'pipeline') {
            if (activeStatuses.includes(itemStatus) || !dData.status) {
              conflictingDoc = doc
              conflictingItemSegment = itemSegment
              break
            }
          } else {
            // manager_prospects
            if (itemStatus !== 'archived' && itemStatus !== 'rejected') {
              conflictingDoc = doc
              conflictingItemSegment = itemSegment
              break
            }
          }
        }
      }

      if (conflictingDoc) {
        const cData = conflictingDoc.data() || {}
        const colName = conflictingDoc.ref.parent.id
        const isFromClients = colName === 'clients'
        const isFromPipeline = colName === 'pipeline'
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

        let resolvedMemberName = (cData.assignedName || cData.memberName || null) as string | null
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
          if (cData.assignedName && cData.assignedName !== 'Commercial terrain') {
            resolvedMemberName = cData.assignedName
          } else {
            resolvedMemberName = null
          }
        }

        const isSameUser = Boolean(
          cData.userId === userId ||
          cData.assignedTo === userId ||
          (isManagerRole && (cData.managerId === userId || cData.managerUid === userId))
        )

        const conflictStatus = isFromClients
          ? 'conclue'
          : isFromPipeline
            ? (cData.status || 'prospection')
            : (cData.status === 'assigned' ? 'assigned' : 'new')

        return NextResponse.json(
          {
            error: 'prospect_already_assigned',
            code: 'PROSPECT_ALREADY_EXISTS_IN_SEGMENT',
            message: isSameUser
              ? 'Vous suivez déjà ce prospect dans votre portefeuille.'
              : isFromClients || conflictStatus === 'conclue'
                ? 'Cette entreprise est déjà cliente de votre organisation (statut conclu).'
                : 'Ce prospect est déjà pris en charge dans votre équipe ou votre segment.',
            conflict: {
              companyName: cData.companyName || cData.name || companyName,
              status: conflictStatus,
              teamManagerName: resolvedTmName,
              teamManagerUid: cTmUid,
              assignedMemberName: resolvedMemberName,
              assignedMemberUid: cAssignedTo,
              segment: cData.segment || conflictingItemSegment || callerSegment || null,
              isSameTeam: Boolean(cTmUid && managerUid && cTmUid.toLowerCase() === managerUid.toLowerCase()),
              isSameUser,
              isFromManagerProspects: colName === 'manager_prospects',
              isConcluded: isFromClients || conflictStatus === 'conclue',
              updatedAt:
                cData.concludedAt ||
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
    if (!callerOrgCode && (companyId || companyName || phoneToTest)) {
      try {
        const indPipeline = adminDb.collection('pipeline').where('userId', '==', userId)
        const indPromises: Promise<any>[] = []
        if (companyId) {
          indPromises.push(indPipeline.where('companyId', '==', companyId).get().catch(() => null))
        }
        if (companyName) {
          indPromises.push(indPipeline.where('companyName', '==', companyName).get().catch(() => null))
          indPromises.push(indPipeline.where('name', '==', companyName).get().catch(() => null))
        }
        if (phoneToTest) {
          indPromises.push(indPipeline.where('companyPhone', '==', phoneToTest).get().catch(() => null))
          indPromises.push(indPipeline.where('phone', '==', phoneToTest).get().catch(() => null))
        }
        indPromises.push(indPipeline.limit(100).get().catch(() => null))

        const indSnaps = await Promise.all(indPromises)
        let foundIndDoc: FirebaseFirestore.DocumentSnapshot | null = null

        for (const snap of indSnaps) {
          if (!snap || !Array.isArray(snap.docs)) continue
          for (const d of snap.docs) {
            const dData = d.data()
            if (!dData) continue
            const itemCompanyId = dData.companyId || null
            const itemDocName = dData.companyName || dData.name || null
            const itemNormalizedName = normalizeCompanyName(itemDocName)
            const itemPhone = dData.companyPhone || dData.phone || null
            const itemPhoneDigits = normalizePhoneDigits(itemPhone)

            const isMatch = Boolean(
              (companyId && itemCompanyId && companyId === itemCompanyId) ||
              (targetNormalizedName && itemNormalizedName && targetNormalizedName === itemNormalizedName) ||
              (targetPhoneDigits && itemPhoneDigits && targetPhoneDigits === itemPhoneDigits)
            )

            if (isMatch) {
              foundIndDoc = d
              break
            }
          }
          if (foundIndDoc) break
        }

        if (foundIndDoc) {
          const dData = foundIndDoc.data() || {}
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
                isConcluded: dData.status === 'conclue',
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
