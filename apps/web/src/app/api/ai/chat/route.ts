import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { ensureDailyReset } from '@/lib/quota-utils'
import { getClientIp, checkRateLimit, checkRateLimitByUser } from '@/lib/rate-limit'
import { GEMINI_TOOLS, GROQ_TOOLS, executeAITool } from '@/lib/ai-tools'

/**
 * Construit un system prompt contextualisé selon le profil utilisateur
 * et informe le modèle de l'accès direct aux outils de la base entreprises.
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

  const contextBlock =
    sector || company || region
      ? `\n\n## Contexte utilisateur (PRIORITAIRE)\n${name ? `- Commercial / Utilisateur : ${name}\n` : ''}${company ? `- Entreprise : ${company}\n` : ''}${sector ? `- Secteur d'activité cible : **${sector}**\n` : ''}${region ? `- Région principale : ${region}\n` : ''}\nOriente tes conseils et exemples vers ce contexte commercial.`
      : ''

  return `Tu es le Companion IA de Sales Companion 2.0, l'assistant commercial B2B de référence au Cameroun.

## Capacités spéciales & Outils Base de Données
Tu as un accès DIRECT à la base de données des entreprises camerounaises via tes outils :
1. \`search_companies\` : utilise cet outil dès que l'utilisateur recherche des entreprises, des cibles, des prospects par nom, secteur, région (ex: Littoral, Centre, Ouest...) ou ville (ex: Douala, Yaoundé, Bafoussam...).
2. \`get_company_details\` : utilise cet outil pour obtenir la fiche complète (dirigeant, contacts, NIU, RCCM, adresse) d'une entreprise spécifique.
3. \`get_market_overview\` : utilise cet outil pour donner des statistiques de marché et la répartition des entreprises.

## Règles de réponse
- Utilise TOUJOURS les outils pour chercher les vraies entreprises avant de répondre. N'invente JAMAIS de fausses entreprises ou de faux numéros de téléphone.
- Quand tu présentes des entreprises trouvées, structure ta réponse clairement :
  - **Nom / Raison Sociale** (et sigle si disponible)
  - **Secteur & Localisation** (Ville, Région, Adresse)
  - **Dirigeant & Contacts** (Téléphone, Email, NIU)
  - **Angle d'approche commercial recommandé**
- Reste concis, pragmatique, orienté conversion et closing B2B au Cameroun.
- Réponds toujours en français professionnel et engageant.${contextBlock}`
}

export async function POST(request: NextRequest) {
  try {
    // 1. IP Rate Limiting (15 req/min)
    const ip = getClientIp(request)
    const ipLimit = await checkRateLimit(ip, { limit: 15, windowMs: 60 * 1000 })
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans une minute.', message: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

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

        // 2. User ID Rate Limiting (10 req/min)
        const userLimit = await checkRateLimitByUser(userId, { limit: 10, windowMs: 60 * 1000 })
        if (!userLimit.success) {
          return NextResponse.json(
            { error: 'Trop de requêtes pour votre compte. Veuillez ralentir.', message: 'Rate limit exceeded' },
            { status: 429 }
          )
        }

        // Lire le profil utilisateur pour le contexte ET vérifier les crédits
        const userRef = adminDb.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (userSnap.exists) {
          const data = userSnap.data() ?? {}
          const dailyLimit = (data.dailyLimit as number) ?? 10
          const plan = data.plan || 'free'

          if (plan === 'free') {
            return NextResponse.json(
              { error: "L'assistant IA n'est pas disponible pour le plan gratuit.", message: 'AI assistant not available for free plan' },
              { status: 403 }
            )
          }

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

    const contents: { role: string; parts: unknown[] }[] = [
      ...(history.slice(-10) as { role: string; parts: unknown[] }[]),
      { role: 'user', parts: [{ text: message }] }
    ]

    // ── 1. Try Gemini with Function Calling ──
    const geminiKey = process.env.GEMINI_API_KEY ?? ''
    if (geminiKey) {
      const reply = await callGeminiWithTools(geminiKey, contents, systemPrompt)
      if (reply) return NextResponse.json({ reply })
    }

    // ── 2. Fallback: Groq with Function Calling ──
    const groqKey =
      process.env.GROQ_API_KEY ||
      ((await adminDb.collection('config').doc('admin').get()).data()?.groq_api_key as
        | string
        | undefined)

    if (groqKey) {
      const reply = await callGroqWithTools(groqKey, message, history, systemPrompt)
      if (reply) return NextResponse.json({ reply })
    }

    // ── Neither key available or both failed ──
    const notConfiguredMessage =
      'Companion IA temporairement indisponible. Veuillez vérifier vos clés API Gemini / Groq.'
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

/**
 * Appel Gemini avec support du Function Calling
 */
async function callGeminiWithTools(
  apiKey: string,
  initialContents: { role: string; parts: unknown[] }[],
  systemPrompt: string
): Promise<string | null> {
  const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-1.5-flash']

  for (const model of models) {
    try {
      const contents = JSON.parse(JSON.stringify(initialContents))

      // Premier tour
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: GEMINI_TOOLS,
            generationConfig: { temperature: 0.6, maxOutputTokens: 1500 }
          })
        }
      )

      if (!res.ok) {
        console.warn(`[AI] Gemini ${model} error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const candidate = data?.candidates?.[0]
      const parts = candidate?.content?.parts || []

      // Vérifier si le modèle a demandé l'appel d'une fonction
      const functionCallPart = parts.find((p: { functionCall?: { name: string; args: Record<string, unknown> } }) => p.functionCall)

      if (functionCallPart && functionCallPart.functionCall) {
        const { name, args } = functionCallPart.functionCall
        console.log(`[AI Tool] Gemini requested function: ${name}`, args)

        const toolResult = await executeAITool(name, args || {})

        // Ajouter l'étape de l'outil dans l'historique Gemini
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name, args } }]
        })

        contents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name,
                response: {
                  output: toolResult
                }
              }
            }
          ]
        })

        // Deuxième tour pour générer la réponse finale synthétisée
        const secondRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { temperature: 0.6, maxOutputTokens: 1500 }
            })
          }
        )

        if (secondRes.ok) {
          const secondData = await secondRes.json()
          const finalText = secondData?.candidates?.[0]?.content?.parts?.[0]?.text
          if (finalText) return finalText
        }
      }

      // Si pas d'outil ou réponse directe
      const directText = parts[0]?.text
      if (directText) return directText
    } catch (e) {
      console.warn(`[AI] Gemini ${model} fetch failed:`, e)
    }
  }

  return null
}

/**
 * Appel Groq avec support du Function Calling (OpenAI compatible)
 */
async function callGroqWithTools(
  apiKey: string,
  message: string,
  history: { role: 'user' | 'model'; parts: [{ text: string }] }[],
  systemPrompt: string
): Promise<string | null> {
  const models = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'groq/compound',
    'openai/gpt-oss-20b'
  ]

  const messages: { role: string; content?: string | null; tool_calls?: unknown; tool_call_id?: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0].text
    })),
    { role: 'user', content: message }
  ]

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          max_tokens: 1500,
          temperature: 0.6
        })
      })

      if (!res.ok) {
        console.warn(`[AI] Groq ${model} error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const choice = data?.choices?.[0]
      const choiceMessage = choice?.message

      // Vérifier si le modèle a demandé l'appel d'un outil
      if (choiceMessage?.tool_calls && Array.isArray(choiceMessage.tool_calls) && choiceMessage.tool_calls.length > 0) {
        messages.push(choiceMessage)

        for (const toolCall of choiceMessage.tool_calls) {
          const fnName = toolCall.function?.name
          let fnArgs: Record<string, unknown> = {}
          try {
            fnArgs = JSON.parse(toolCall.function?.arguments || '{}')
          } catch {
            fnArgs = {}
          }

          console.log(`[AI Tool] Groq requested function: ${fnName}`, fnArgs)
          const toolResult = await executeAITool(fnName, fnArgs)

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          })
        }

        // Deuxième tour Groq
        const secondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 1500,
            temperature: 0.6
          })
        })

        if (secondRes.ok) {
          const secondData = await secondRes.json()
          const finalText = secondData?.choices?.[0]?.message?.content
          if (finalText) return finalText
        }
      }

      const directText = choiceMessage?.content
      if (directText) return directText
    } catch (e) {
      console.warn(`[AI] Groq ${model} fetch failed:`, e)
    }
  }

  return null
}
