import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { ensureDailyReset } from '@/lib/quota-utils'

/**
 * Construit un system prompt contextualisé selon le profil utilisateur.
 * Si le secteur/industrie de l'utilisateur est connu, l'IA adapte TOUTES ses réponses.
 */
function buildSystemPrompt(userContext?: {
  sector?: string | null
  company?: string | null
  region?: string | null
  name?: string | null
}): string {
  const sector = userContext?.sector?.trim()
  const company = userContext?.company?.trim()
  const region = userContext?.region?.trim()
  const name = userContext?.name?.trim()

  // Contexte dynamique injecté si disponible
  const contextBlock =
    sector || company || region
      ? `\n\n## Contexte utilisateur (PRIORITAIRE)\n${name ? `- Utilisateur : ${name}\n` : ''}${company ? `- Entreprise : ${company}\n` : ''}${sector ? `- Secteur d'activité / Industrie : **${sector}**\n` : ''}${region ? `- Région / Marché principal : ${region}\n` : ''}\n⚠️ Tu dois adapter TOUTES tes réponses à ce contexte. Si l'utilisateur demande un email, un script ou une analyse, oriente systématiquement vers son secteur (${sector ?? 'son secteur'}) et sa réalité terrain. N'utilise pas d'exemples génériques si tu connais son secteur.`
      : ''

  return `Tu es le Companion IA de Sales Companion 2.0, une plateforme de prospection commerciale au Cameroun.
Tu aides les commerciaux camerounais à :
- Identifier et approcher des entreprises cibles
- Rédiger des emails et scripts d'approche B2B professionnels
- Analyser les secteurs d'activité (BTP, Tech, Agroalimentaire, Transport, Santé, etc.)
- Comprendre les dynamiques du marché camerounais (Douala, Yaoundé, et autres régions)

Réponds toujours en français. Sois concis, pratique et actionnable.
Utilise des emojis avec modération pour rendre tes réponses plus lisibles.
Quand tu rédiges un email, utilise un format professionnel complet.${contextBlock}`
}

export async function POST(request: NextRequest) {
  try {
    // Auth check + credit deduction
    const token = request.headers.get('authorization')?.split(' ')[1]
    let userId: string | null = null
    let userContext: {
      sector?: string | null
      company?: string | null
      region?: string | null
      name?: string | null
    } = {}

    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token)
        userId = decoded.uid

        // Lire le profil utilisateur pour le contexte ET vérifier les crédits
        const userRef = adminDb.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (userSnap.exists) {
          const data = userSnap.data()!
          const dailyLimit = (data.dailyLimit as number) ?? 10

          // Vérification et reset si nouveau jour (Lazy Reset)
          const currentDailyUsed = await ensureDailyReset(userRef, data)

          if (currentDailyUsed >= dailyLimit) {
            const quotaMessage = `Quota journalier épuisé (${dailyLimit} crédits). Votre compteur sera réinitialisé demain.`
            return NextResponse.json(
              { error: quotaMessage, message: quotaMessage },
              { status: 429 }
            )
          }
          await userRef.update({ dailyUsed: currentDailyUsed + 1 })

          // Extraire le contexte métier de l'utilisateur
          userContext = {
            sector: data.sector ?? data.industry ?? null,
            company: data.company ?? data.companyName ?? null,
            region: data.region ?? null,
            name: data.name ?? null
          }
        }
      } catch {
        return NextResponse.json(
          { error: 'Non authentifié', message: 'Non authentifié' },
          { status: 401 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Non authentifié', message: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      message,
      history = [],
      userProfile
    } = body as {
      message: string
      history?: { role: 'user' | 'model'; parts: [{ text: string }] }[]
      userProfile?: { sector?: string; company?: string; region?: string; name?: string }
    }

    // Fusionner contexte Firestore + contexte envoyé par le client (priorité Firestore)
    const mergedContext = {
      sector: userContext.sector ?? userProfile?.sector ?? null,
      company: userContext.company ?? userProfile?.company ?? null,
      region: userContext.region ?? userProfile?.region ?? null,
      name: userContext.name ?? userProfile?.name ?? null
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide', message: 'Message vide' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(mergedContext)

    const contents: { role: string; parts: [{ text: string }] }[] = [
      ...(history.slice(-10) as { role: string; parts: [{ text: string }] }[]),
      { role: 'user', parts: [{ text: message }] }
    ]

    // ── Try Gemini first (env var) ──
    const geminiKey = process.env.GEMINI_API_KEY ?? ''
    if (geminiKey) {
      const reply = await callGemini(geminiKey, contents, systemPrompt)
      if (reply) return NextResponse.json({ reply })
    }

    // ── Fallback: Groq key from Firestore config ──
    const configSnap = await adminDb.collection('config').doc('admin').get()
    const groqKey = configSnap.data()?.groq_api_key as string | undefined

    if (groqKey) {
      const reply = await callGroq(groqKey, message, history, systemPrompt)
      if (reply) return NextResponse.json({ reply })
    }

    // ── Neither key available ──
    const notConfiguredMessage =
      'Companion IA non configuré. Veuillez ajouter GEMINI_API_KEY dans les variables Railway, ou renseigner une clé Groq dans le panel Admin → Configuration.'
    return NextResponse.json(
      {
        error: notConfiguredMessage,
        message: notConfiguredMessage
      },
      { status: 503 }
    )
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/* ── Gemini 1.5 Flash ── */
async function callGemini(
  apiKey: string,
  contents: { role: string; parts: [{ text: string }] }[],
  systemPrompt: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    )
    if (!res.ok) {
      console.error('Gemini error:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch (e) {
    console.error('Gemini fetch failed:', e)
    return null
  }
}

/* ── Groq (llama-3.3-70b) ── */
async function callGroq(
  apiKey: string,
  message: string,
  history: { role: 'user' | 'model'; parts: [{ text: string }] }[],
  systemPrompt: string
): Promise<string | null> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text
      })),
      { role: 'user', content: message }
    ]

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    })
    if (!res.ok) {
      console.error('Groq error:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? null
  } catch (e) {
    console.error('Groq fetch failed:', e)
    return null
  }
}
