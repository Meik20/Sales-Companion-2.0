import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/utils/email'

async function getAdmin() {
  const { adminAuth } = await import('@/lib/firebase-admin')
  return { adminAuth }
}

export async function POST(request: NextRequest) {
  try {
    const { adminAuth } = await getAdmin()
    
    // Authorization header
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const email = decoded.email

    if (!email) {
      return NextResponse.json({ message: 'Email introuvable' }, { status: 400 })
    }

    const actionCodeSettings = {
      // Must match an authorized domain in Firebase Console. 
      url: process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/login` 
            : 'https://www.salescompanion2-0.com/login',
      handleCodeInApp: false
    }

    const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings)

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1f36; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background-color: #1b7a3e; color: white; font-weight: bold; font-size: 24px; padding: 12px 24px; display: inline-block; border-radius: 8px;">
            SC
          </div>
        </div>
        <h2 style="color: #111827; font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 24px;">Vérification de votre adresse e-mail</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 16px;">Bonjour,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">
          Merci d'avoir créé un compte sur Sales Companion 2.0. Pour finaliser votre inscription et sécuriser votre compte, veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous :
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${link}" style="background-color: #2ea05a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
            Vérifier mon e-mail
          </a>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 32px;">
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px; margin-top: 0;">Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien directement dans votre navigateur :</p>
          <p style="word-break: break-all; color: #374151; font-size: 13px; margin: 0;">${link}</p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;">À très vite,<br/><strong>L'équipe Sales Companion</strong></p>
        </div>
      </div>
    `

    const result = await sendEmail({
      to: email,
      subject: 'Action requise : Vérifiez votre adresse e-mail - Sales Companion 2.0',
      html
    })

    if (!result.success) {
      console.error('[send-verification] SendEmail returned error', result.error)
      return NextResponse.json({ message: 'Erreur lors de l\'envoi (SMTP)' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[send-verification]', error)
    return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 })
  }
}
