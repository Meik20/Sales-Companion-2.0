import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

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
    // Auth check (optionnel mais recommandé)
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (token) {
      try {
        await adminAuth.verifyIdToken(token)
      } catch {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API IA non configurée. Contactez l\'administrateur.' }, { status: 503 })
    }

    const body = await request.json()
    const { message, history = [] } = body as {
      message: string
      history?: { role: 'user' | 'model'; parts: [{ text: string }] }[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    // Build conversation history for Gemini
    const contents = [
      ...history.slice(-10), // Keep last 10 exchanges for context
      { role: 'user', parts: [{ text: message }] },
    ]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'Erreur du service IA. Réessayez dans un instant.' }, { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Désolé, je n\'ai pas pu générer de réponse.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
