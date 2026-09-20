import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/profile/update
 * Met à jour le profil utilisateur de manière sécurisée via Firebase Admin SDK.
 * - Les indépendants et administrateurs peuvent modifier leur profil librement.
 * - Les managers nécessitent un jeton d'autorisation à usage unique (profile_edit_tokens).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Session expirée ou invalide.' }, { status: 401 })
    }

    const body = await request.json()
    const { token, name, company, sector, region, phone } = body

    const userDocRef = adminDb.collection('users').doc(decoded.uid)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
    }

    const userData = userDoc.data() || {}
    const role = userData.role || 'independent'

    // Pour les membres d'équipe simples : modification interdite
    if (role === 'member') {
      return NextResponse.json(
        { error: 'Les membres d’équipe ne peuvent pas modifier leur profil.' },
        { status: 403 }
      )
    }

    // Pour les managers : contrôle d'autorisation strict
    if (role === 'manager') {
      let resolvedToken = typeof token === 'string' && token.trim() ? token.trim() : null

      // Fallback robuste : si le token n'a pas été passé par le front (ex: modal déjà ouverte),
      // rechercher le dernier token généré dans les dernières 24h pour cet utilisateur non encore sauvegardé
      if (!resolvedToken) {
        const recentTokensSnap = await adminDb
          .collection('profile_edit_tokens')
          .where('userId', '==', decoded.uid)
          .get()

        const candidate = recentTokensSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((d) => {
            const exp = d.expiresAt?.toDate ? d.expiresAt.toDate().getTime() : 0
            return exp > Date.now() && d.profileSaved !== true
          })
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0]

        if (candidate) {
          resolvedToken = candidate.id
        }
      }

      if (!resolvedToken) {
        return NextResponse.json(
          { error: 'Autorisation du support requise pour modifier les informations de ce compte Manager.' },
          { status: 403 }
        )
      }

      const tokenRef = adminDb.collection('profile_edit_tokens').doc(resolvedToken)
      const tokenDoc = await tokenRef.get()

      if (!tokenDoc.exists) {
        return NextResponse.json(
          { error: 'Jeton d’autorisation introuvable ou invalide.' },
          { status: 404 }
        )
      }

      const tokenData = tokenDoc.data() || {}

      if (tokenData.userId !== decoded.uid) {
        return NextResponse.json(
          { error: 'Ce jeton ne correspond pas à votre compte.' },
          { status: 403 }
        )
      }

      if (tokenData.profileSaved === true) {
        return NextResponse.json(
          { error: 'Cette autorisation à usage unique a déjà été utilisée pour enregistrer le profil.' },
          { status: 410 }
        )
      }

      const expiresAt = tokenData.expiresAt?.toDate ? tokenData.expiresAt.toDate() : null
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'Ce jeton d’autorisation a expiré.' },
          { status: 410 }
        )
      }

      // Marquer le jeton comme définitivement utilisé et profil sauvegardé
      await tokenRef.update({
        profileSaved: true,
        used: true,
        savedAt: FieldValue.serverTimestamp(),
        status: 'completed'
      })
    }

    // Mise à jour sécurisée des champs du profil dans Firestore
    const cleanedName = typeof name === 'string' && name.trim() ? name.trim() : userData.name
    const cleanedCompany = typeof company === 'string' && company.trim() ? company.trim() : null
    const cleanedSector = typeof sector === 'string' && sector ? sector : null
    const cleanedRegion = typeof region === 'string' && region ? region : null
    const cleanedPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null

    const updatePayload: Record<string, any> = {
      name: cleanedName,
      company: cleanedCompany,
      companyName: cleanedCompany,
      sector: cleanedSector,
      industry: cleanedSector,
      region: cleanedRegion,
      phone: cleanedPhone,
      profileEditAuthorizedUntil: FieldValue.delete(),
      profileEditToken: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    }

    await userDocRef.update(updatePayload)

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès.',
      data: {
        name: cleanedName,
        company: cleanedCompany,
        sector: cleanedSector,
        region: cleanedRegion,
        phone: cleanedPhone
      }
    })
  } catch (error: any) {
    console.error('Erreur API update profile:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du profil.' },
      { status: 500 }
    )
  }
}
