import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { sendEmail } from '@/utils/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/approve-domain
 * Action admin pour valider une demande de dérogation d'email d'entreprise.
 * Génère un token d'exemption, résout le ticket et envoie un email avec le lien d'inscription.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId, email, name, companyName, sector } = body

    if (!threadId || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Données manquantes (threadId et email requis).' },
        { status: 400 }
      )
    }

    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedName = (name || '').trim()
    const sanitizedCompany = (companyName || '').trim()
    const sanitizedSector = (sector || '').trim()

    // 1. Vérifier l'existence du ticket support
    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadDoc = await threadRef.get()

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Ticket de support introuvable.' }, { status: 404 })
    }

    // 2. Générer un jeton d'exemption unique et sécurisé (valide 7 jours)
    const exemptionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await adminDb.collection('domain_exemptions').doc(exemptionToken).set({
      token: exemptionToken,
      email: sanitizedEmail,
      name: sanitizedName,
      companyName: sanitizedCompany,
      sector: sanitizedSector,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      threadId,
      used: false
    })

    // 3. Mettre à jour le ticket support
    const now = FieldValue.serverTimestamp()
    await threadRef.update({
      status: 'resolved',
      domainExemptionStatus: 'approved',
      domainExemptionToken: exemptionToken,
      domainExemptionApprovedAt: now,
      updatedAt: now
    })

    // Ajouter le message de traçabilité dans le fil de discussion
    await threadRef.collection('messages').add({
      content: `✅ [Action Admin] La dérogation pour l'adresse ${sanitizedEmail} (${sanitizedCompany || 'Entreprise'}) a été validée. Un email contenant le lien sécurisé d'inscription a été transmis avec succès.`,
      senderId: 'admin',
      senderRole: 'admin',
      createdAt: now
    })

    // 4. Construire le lien sécurisé d'inscription
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'https://salescompanion2-0.com'

    const queryParams = new URLSearchParams()
    queryParams.set('exemption', exemptionToken)
    queryParams.set('email', sanitizedEmail)
    queryParams.set('role', 'manager')
    if (sanitizedName) queryParams.set('name', sanitizedName)
    if (sanitizedCompany) queryParams.set('company', sanitizedCompany)
    if (sanitizedSector) queryParams.set('sector', sanitizedSector)

    const registerLink = `${appUrl}/register?${queryParams.toString()}`

    // 5. Envoyer l'email transactionnel au demandeur
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre accès Manager a été validé</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b1120;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" style="max-width:580px;background-color:#131c2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid #1e293b;background:linear-gradient(180deg, rgba(37,99,235,0.1) 0%, rgba(19,28,46,0) 100%);">
              <div style="display:inline-block;padding:8px 16px;background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.3);border-radius:8px;font-weight:800;font-size:18px;color:#60a5fa;letter-spacing:0.5px;">
                SALES COMPANION 2.0
              </div>
              <h1 style="margin:20px 0 6px;font-size:22px;font-weight:800;color:#ffffff;">
                Demande d'accès approuvée ! 🎉
              </h1>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Votre dérogation pour la création d'un compte Manager a été validée.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Bonjour <strong>${sanitizedName || sanitizedEmail}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#94a3b8;">
                L'équipe administrative de Sales Companion 2.0 a examiné et approuvé votre demande d'inscription pour votre organisation <strong>${sanitizedCompany ? sanitizedCompany : 'commerciale'}</strong>.
              </p>

              <!-- Recap Box -->
              <table width="100%" style="background-color:#1e2a3b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                      Détails de l'autorisation
                    </div>
                    <div style="font-size:13px;color:#cbd5e1;margin-bottom:4px;">
                      <strong>Email autorisé :</strong> ${sanitizedEmail}
                    </div>
                    ${sanitizedCompany ? `<div style="font-size:13px;color:#cbd5e1;margin-bottom:4px;"><strong>Entreprise :</strong> ${sanitizedCompany}</div>` : ''}
                    <div style="font-size:13px;color:#cbd5e1;">
                      <strong>Type de compte :</strong> Manager d'Équipe Commerciale
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Cliquez sur le bouton ci-dessous pour finaliser la création de votre mot de passe et accéder à votre espace :
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${registerLink}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
                      Finaliser mon inscription Manager →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien direct dans votre navigateur :
              </p>
              <p style="margin:0 0 20px;font-size:11px;word-break:break-all;color:#38bdf8;">
                ${registerLink}
              </p>

              <div style="border-top:1px solid #1e293b;padding-top:16px;font-size:11.5px;color:#64748b;line-height:1.5;">
                ⏱️ Ce lien est strictement personnel et valide pendant <strong>7 jours</strong>. Passé ce délai, une nouvelle demande devra être soumise.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;text-align:center;background-color:#0f172a;border-top:1px solid #1e293b;font-size:11px;color:#64748b;">
              © ${new Date().getFullYear()} Sales Companion 2.0 — Plateforme d'Intelligence Commerciale B2B.<br>
              Ceci est un email automatique, merci de ne pas y répondre directement.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    const emailResult = await sendEmail({
      to: sanitizedEmail,
      subject: `🎉 Votre compte Manager Sales Companion 2.0 a été validé !`,
      html: emailHtml,
      text: `Bonjour ${sanitizedName || sanitizedEmail},\n\nVotre demande de création de compte Manager pour ${sanitizedCompany || 'votre entreprise'} a été approuvée par l'administrateur Sales Companion 2.0.\n\nFinalisez votre inscription ici : ${registerLink}\n\nCe lien est valide pendant 7 jours.`
    })

    return NextResponse.json({
      success: true,
      message: 'Demande validée et email envoyé avec succès.',
      token: exemptionToken,
      registerLink,
      emailSent: emailResult?.success ?? true
    })
  } catch (error: any) {
    console.error('[approve-domain POST]', error)
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'approbation de la demande." },
      { status: 500 }
    )
  }
}
