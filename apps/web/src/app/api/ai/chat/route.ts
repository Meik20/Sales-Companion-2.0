import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { ensureDailyReset } from '@/lib/quota-utils'
import { getClientIp, checkRateLimit, checkRateLimitByUser } from '@/lib/rate-limit'
import { GEMINI_TOOLS, GROQ_TOOLS, executeAITool } from '@/lib/ai-tools'
import { searchCompanies, type CompanyRecord } from '@/lib/company-search'
import { PLAN_LIMITS } from '@sales-companion/shared'

function detectSectorFromText(text: string): string | undefined {
  const t = text.toLowerCase()
  if (t.includes('btp') || t.includes('construction') || t.includes('batiment') || t.includes('immobilier')) return 'BTP & Construction'
  if (t.includes('agro') || t.includes('agriculture') || t.includes('alimentaire') || t.includes('elevage')) return 'Agriculture & Agroalimentaire'
  if (t.includes('tech') || t.includes('informatique') || t.includes('numerique') || t.includes('logiciel') || t.includes('digital')) return 'Technologies & Numérique'
  if (t.includes('transport') || t.includes('logistique') || t.includes('fret') || t.includes('livraison')) return 'Transport & Logistique'
  if (t.includes('sante') || t.includes('medical') || t.includes('pharmacie') || t.includes('clinique') || t.includes('hopital')) return 'Santé'
  if (t.includes('commerce') || t.includes('vente') || t.includes('distribution') || t.includes('import') || t.includes('export')) return 'Commerce'
  if (t.includes('finance') || t.includes('banque') || t.includes('assurance') || t.includes('microfinance') || t.includes('comptabilite')) return 'Finance & Assurance'
  if (t.includes('energie') || t.includes('mine') || t.includes('petrole') || t.includes('gaz') || t.includes('solaire') || t.includes('eau')) return 'Énergie & Mines'
  if (t.includes('industrie') || t.includes('usine') || t.includes('fabrication') || t.includes('manufacture')) return 'Industrie manufacturière'
  if (t.includes('hotel') || t.includes('restaurant') || t.includes('tourisme') || t.includes('traiteur')) return 'Hôtellerie & Restauration'
  if (t.includes('education') || t.includes('formation') || t.includes('ecole') || t.includes('universite') || t.includes('academie')) return 'Éducation & Formation'
  if (t.includes('service') || t.includes('conseil') || t.includes('audit') || t.includes('consulting') || t.includes('communication')) return 'Services & Conseil'
  return undefined
}

function detectRegionFromText(text: string): string | undefined {
  const t = text.toLowerCase()
  if (t.includes('douala') || t.includes('littoral') || t.includes('edea') || t.includes('nkongsamba')) return 'Littoral'
  if (t.includes('yaounde') || t.includes('centre') || t.includes('mbalmayo') || t.includes('bafia')) return 'Centre'
  if (t.includes('bafoussam') || t.includes('ouest') || t.includes('dschang') || t.includes('foumban')) return 'Ouest'
  if (t.includes('bamenda') || t.includes('nord-ouest') || t.includes('kumbo')) return 'Nord-Ouest'
  if (t.includes('buea') || t.includes('limbe') || t.includes('sud-ouest') || t.includes('kumba')) return 'Sud-Ouest'
  if (t.includes('garoua') || t.includes('nord') || t.includes('guider')) return 'Nord'
  if (t.includes('maroua') || t.includes('extreme-nord') || t.includes('kousseri')) return 'Extrême-Nord'
  if (t.includes('ngaoundere') || t.includes('adamaoua') || t.includes('meiganga')) return 'Adamaoua'
  if (t.includes('bertoua') || t.includes('est') || t.includes('batouri')) return 'Est'
  if (t.includes('ebolowa') || t.includes('kribi') || t.includes('sud') || t.includes('sangmelima')) return 'Sud'
  return undefined
}

/**
 * Construit un system prompt contextualisé ultra-performant bilingue (FR/EN)
 * avec injection directe des entreprises réelles pour un temps de réponse instantané (< 1.5s).
 */
function buildSystemPrompt(
  userContext?: {
    sector?: string | null
    company?: string | null
    region?: string | null
    name?: string | null
  },
  preFetchedCompanies?: Partial<CompanyRecord>[],
  lang: 'fr' | 'en' = 'fr'
): string {
  const sector = userContext?.sector?.trim()
  const company = userContext?.company?.trim()
  const region = userContext?.region?.trim()
  const name = userContext?.name?.trim()

  const contextBlock =
    sector || company || region
      ? `\n\n## Contexte Utilisateur Connecté / User Profile\n${name ? `- Commercial / User : **${name}**\n` : ''}${company ? `- Entreprise / Company : ${company}\n` : ''}${sector ? `- Secteur cible / Target Sector : **${sector}**\n` : ''}${region ? `- Région principale / Main Region : **${region}**\n` : ''}`
      : ''

  const preFetchedBlock =
    preFetchedCompanies && preFetchedCompanies.length > 0
      ? `\n\n## 🏢 Entreprises Réelles de la Base / Real Verified Companies in Database
Voici des entreprises officielles camerounaises enregistrées dans l'application :
${preFetchedCompanies
  .map(
    (c, i) =>
      `${i + 1}. **${c.raisonSociale}** ${c.sigle ? `(${c.sigle})` : ''}
   - Secteur / Sector : ${c.sector || 'Général'} | Localisation : ${c.city || ''} (${c.region || ''})
   - Dirigeant / Executive : ${c.dirigeant || 'Non spécifié'} | NIU : ${c.niu || 'N/A'}
   - Téléphone : ${c.telephone || 'Non renseigné'} | Email : ${c.email || 'Non renseigné'}
   - Adresse : ${c.adresse || 'Non spécifiée'}`
  )
  .join('\n')}`
      : ''

  return `Tu es le Companion IA de Sales Companion 2.0, l'assistant commercial B2B ultra-rapide et expert en prospection au Cameroun.
You are the AI Companion for Sales Companion 2.0, the ultra-fast B2B sales and prospecting assistant in Cameroon.

${contextBlock}
${preFetchedBlock}

## 🌐 LANGUE / LANGUAGE POLICY (STRICT)
- **BILINGUAL CAPABILITY** : You must seamlessly support both French and English.
- **Language Preference** : Current user context language is **${lang === 'en' ? 'ENGLISH' : 'FRANÇAIS'}**.
- If the user writes or prompts in English (e.g. "provide 3 companies", "draft an outreach email", "find leads"), respond in fluent, professional, and persuasive **ENGLISH**.
- If the user writes in French, respond in fluent, professional, and persuasive **FRENCH**.

## ⚡ RÈGLE DE PERFORMANCE & RÉPONSE INSTANTANÉE / FAST RESPONSE RULES
1. **Quand l'utilisateur demande des entreprises pour son secteur ou pour prospection** (ex: "fournis moi 3 entreprises concernées par mon secteur d'activité pour prospection" ou "provide 3 companies in my sector for prospecting") :
   - Réponds **IMMÉDIATEMENT** en sélectionnant 3 entreprises parmi la liste des entreprises réelles ci-dessus.
   - Présente chaque entreprise avec sa fiche claire :
     • **Nom de l'entreprise / Company Name** (et sigle)
     • **Secteur & Localisation / Sector & Location** (Ville, Région, Adresse)
     • **Contacts vérifiés / Verified Contacts** (Dirigeant, Téléphone, Email, NIU)
     • **Angle d'approche commercial / Recommended Sales Angle** (pourquoi et comment l'approcher efficacement / why and how to pitch them)
   - Sois direct, structuré et orienté closing B2B.

2. **Recherches avancées / Advanced custom queries** :
   - Tu disposes aussi des outils (\`search_companies\`, \`get_company_details\`, \`get_market_overview\`) si l'utilisateur demande un secteur ou une ville différente de la sélection ci-dessus.

3. **Authenticité stricte / Zero Hallucination** :
   - Toutes les entreprises présentées doivent provenir STRICTEMENT de la base de données. N'invente JAMAIS de fausses entreprises ou de faux contacts.`
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
          const plan = (data.plan || 'free') as keyof typeof PLAN_LIMITS
          const dailyLimit = PLAN_LIMITS[plan] ?? 10

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
            sector: data.sector ?? data.industry ?? data.activite ?? null,
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
      userProfile,
      lang: reqLang
    } = body as {
      message: string
      history?: { role: 'user' | 'model'; parts: [{ text: string }] }[]
      userProfile?: { sector?: string; company?: string; region?: string; name?: string }
      lang?: 'fr' | 'en'
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide', message: 'Message vide' }, { status: 400 })
    }

    // Détection automatique de la langue (EN/FR)
    const isEnText =
      /\b(hi|hello|hey|give me|find|search|company|companies|prospect|outreach|email|draft|sector|leads|help|please|what|how)\b/i.test(
        message
      )
    const activeLang: 'fr' | 'en' = reqLang === 'en' || isEnText ? 'en' : 'fr'

    const mergedContext = {
      sector: userContext.sector ?? userProfile?.sector ?? null,
      company: userContext.company ?? userProfile?.company ?? null,
      region: userContext.region ?? userProfile?.region ?? null,
      name: userContext.name ?? userProfile?.name ?? null
    }

    // ── Pré-chargement ultra-rapide des entreprises pertinentes (< 2ms) ──
    const targetSector = mergedContext.sector || detectSectorFromText(message)
    const targetRegion = mergedContext.region || detectRegionFromText(message)

    let preFetchedCompanies: Partial<CompanyRecord>[] = []
    try {
      const searchRes = await searchCompanies({
        sector: targetSector || undefined,
        region: targetRegion || undefined,
        limit: 6
      })
      preFetchedCompanies = searchRes.results
      // Si aucun résultat spécifique, charger des entreprises réelles par défaut
      if (preFetchedCompanies.length === 0) {
        const defaultRes = await searchCompanies({ limit: 6 })
        preFetchedCompanies = defaultRes.results
      }
    } catch (err) {
      console.warn('[AI Pre-fetch] Could not pre-fetch companies:', err)
    }

    const systemPrompt = buildSystemPrompt(mergedContext, preFetchedCompanies, activeLang)

    const contents: { role: string; parts: unknown[] }[] = [
      ...(history.slice(-10) as { role: string; parts: unknown[] }[]),
      { role: 'user', parts: [{ text: message }] }
    ]

    // ── 1. Try Gemini with Function Calling & Pre-Fetched Context ──
    const geminiKey = process.env.GEMINI_API_KEY ?? ''
    if (geminiKey) {
      const reply = await callGeminiWithTools(geminiKey, contents, systemPrompt)
      if (reply) return NextResponse.json({ reply })
    }

    // ── 2. Fallback: Groq with Function Calling & Pre-Fetched Context ──
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

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: GEMINI_TOOLS,
            generationConfig: { temperature: 0.5, maxOutputTokens: 1200 }
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

      const functionCallPart = parts.find((p: { functionCall?: { name: string; args: Record<string, unknown> } }) => p.functionCall)

      if (functionCallPart && functionCallPart.functionCall) {
        const { name, args } = functionCallPart.functionCall
        const toolResult = await executeAITool(name, args || {})

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

        const secondRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { temperature: 0.5, maxOutputTokens: 1200 }
            })
          }
        )

        if (secondRes.ok) {
          const secondData = await secondRes.json()
          const finalText = secondData?.candidates?.[0]?.content?.parts?.[0]?.text
          if (finalText) return finalText
        }
      }

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
          max_tokens: 1200,
          temperature: 0.5
        })
      })

      if (!res.ok) {
        console.warn(`[AI] Groq ${model} error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const choice = data?.choices?.[0]
      const choiceMessage = choice?.message

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

          const toolResult = await executeAITool(fnName, fnArgs)

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          })
        }

        const secondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 1200,
            temperature: 0.5
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
