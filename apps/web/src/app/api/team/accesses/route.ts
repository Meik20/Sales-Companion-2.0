import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { sendEmail } from '@/utils/email'

function normalizeText(text: string) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid
    
    // Vérification du rôle manager
    const managerDoc = await adminDb.collection('users').doc(managerUid).get()
    const managerData = managerDoc.data()
    
    if (managerData?.role !== 'manager') {
       return NextResponse.json({ error: 'Accès refusé. Seul un manager peut créer des accès.' }, { status: 403 })
    }

    const { firstname, lastname, company, email, permissions } = await request.json()

    if (!firstname || !lastname || !company) {
      return NextResponse.json({ error: 'Informations manquantes' }, { status: 400 })
    }

    const first = normalizeText(firstname)
    const last = normalizeText(lastname)
    const comp = normalizeText(company)
    const accessId = `${first}${last}@${comp}`

    // Vérifier si l'accessId existe déjà
    const query = await adminDb.collection('team_accesses').where('accessId', '==', accessId).get()
    if (!query.empty) {
       return NextResponse.json({ error: 'Cet identifiant existe déjà (ou le membre a déjà été invité)' }, { status: 400 })
    }

    // Permissions par défaut
    const perms = permissions || {
      canExport: false,
      canDelete: false,
      canAssign: false
    }

    // Génération d'un code magique pour l'activation simplifiée (Magic Link)
    const magicCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const defaultLimits: Record<string, number> = { free: 10, starter: 50, pro: 200, enterprise: 1000 }
    const managerPlan = managerData?.plan || 'free'

    const newAccess = {
      managerUid,
      managerEmail: managerData?.email || null,
      accessId,
      firstname,
      lastname,
      company,
      email: email || null,
      status: email ? 'pending_email' : 'pending',
      activated: false,
      permissions: perms,
      plan: managerPlan,
      dailyLimit: managerData?.dailyLimit || defaultLimits[managerPlan] || 10,
      magicCode,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = await adminDb.collection('team_accesses').add(newAccess)

    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'}/activate?code=${magicCode}`

    if (email) {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #eef2f6; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 24px; font-weight: 800; color: #185FA5; letter-spacing: -0.5px;">Sales Companion 2.0</span>
          </div>
          
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 15px;">Invitation à rejoindre l'équipe</h2>
          
          <p style="margin-bottom: 20px; font-size: 15px; color: #475569;">
            Bonjour <strong>${firstname} ${lastname}</strong>,
          </p>
          
          <p style="margin-bottom: 20px; font-size: 15px; color: #475569;">
            Votre manager vous a généré un accès membre pour rejoindre l'espace commercial de l'entreprise <strong>${company}</strong>.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
            <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px;">Identifiant d'accès (Access ID)</span>
            <code style="font-family: monospace; font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${accessId}</code>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${magicLink}" target="_blank" style="display: inline-block; background-color: #185FA5; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 30px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(24, 95, 165, 0.2), 0 2px 4px -1px rgba(24, 95, 165, 0.1); transition: all 150ms ease;">
              Activer mon compte
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-bottom: 25px; text-align: center;">
            Ou copiez-collez ce lien : <br/>
            <a href="${magicLink}" style="color: #185FA5; text-decoration: underline; word-break: break-all;">${magicLink}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
          
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            Cet e-mail est généré automatiquement. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
          </p>
        </div>
      `

      await sendEmail({
        to: email.trim(),
        subject: `Sales Companion 2.0 — Invitation de ${company}`,
        html: emailHtml
      }).catch(err => {
        console.error('[team/accesses] Failed to send activation email:', err)
      })
    }

    return NextResponse.json({ 
      success: true, 
      accessId, 
      id: docRef.id,
      magicCode,
      magicLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'}/activate?code=${magicCode}`
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('[team/accesses] ERREUR:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}