import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

const SYSTEM_PROMPT = `Tu es l'Assistant IA B2B de Sales Companion, une plateforme de prospection commerciale au Cameroun.
Tu aides les commerciaux camerounais à :
- Identifier et approcher des entreprises cibles
- Rédiger des emails et scripts d'approche B2B professionnels
- Analyser les secteurs d'activité (BTP, Tech, Agroalimentaire, Transport, Santé, etc.)
- Comprendre les dynamiques du marché camerounais (Douala, Yaoundé, et autres régions)

Réponds toujours en français. Sois concis, pratique et actionnable.
Utilise des emojis avec modération pour rendre tes réponses plus lisibles.
Quand tu rédiges un email, utilise un format professionnel complet.`

export async function POST(request: NextRequest) {
  try {
    // Auth check + credit deduction
    const token = request.headers.get('authorization')?.split(' ')[1]
    let userId: string | null = null

    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token)
        userId = decoded.uid

        // Vérifier et déduire 1 crédit
        const userRef = adminDb.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (userSnap.exists) {
          const data = userSnap.data()!
          const dailyUsed  = (data.dailyUsed  as number) ?? 0
          const dailyLimit = (data.dailyLimit as number) ?? 10
          if (dailyUsed >= dailyLimit) {
            return NextResponse.json(
              { error: `Quota journalier épuisé (${dailyLimit} crédits). Votre compteur sera réinitialisé demain.` },
              { status: 429 }
            )
          }
          await userRef.update({ dailyUsed: dailyUsed + 1 })
        }
      } catch {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { message, history = [] } = body as {
      message: string
      history?: { role: 'user' | 'model'; parts: [{ text: string }] }[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    const contents: { role: string; parts: [{ text: string }] }[] = [
      ...history.slice(-10) as { role: string; parts: [{ text: string }] }[],
      { role: 'user', parts: [{ text: message }] },
    ]

    // ── Try Gemini first (env var) ──
    const geminiKey = process.env.GEMINI_API_KEY ?? ''
    if (geminiKey) {
      const reply = await callGemini(geminiKey, contents)
      if (reply) return NextResponse.json({ reply })
    }

    // ── Fallback: Groq key from Firestore config ──
    const configSnap = await adminDb.collection('config').doc('admin').get()
    const groqKey = configSnap.data()?.groq_api_key as string | undefined

    if (groqKey) {
      const reply = await callGroq(groqKey, message, history)
      if (reply) return NextResponse.json({ reply })
    }

    // ── Neither key available ──
    return NextResponse.json(
      {
        error:
          'Assistant IA non configuré. Veuillez ajouter GEMINI_API_KEY dans les variables Railway, ou renseigner une clé Groq dans le panel Admin → Configuration.',
      },
      { status: 503 }
    )
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/* ── Gemini 1.5 Flash ── */
async function callGemini(
  apiKey: string,
  contents: { role: string; parts: [{ text: string }] }[]
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
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
  history: { role: 'user' | 'model'; parts: [{ text: string }] }[]
): Promise<string | null> {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((h) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text,
      })),
      { role: 'user', content: message },
    ]

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
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
