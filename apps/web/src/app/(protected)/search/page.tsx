'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { SearchFiltersForm } from '@/features/search/components/SearchFiltersForm'
import { CompaniesSearchResults } from '@/features/search/components/CompaniesSearchResults'
import { SaveCurrentSearchButton } from '@/features/search/components/SaveCurrentSearchButton'
import { useCompaniesSearch } from '@/features/search/hooks/useCompaniesSearch'
import { usePipelineStats } from '@/features/pipeline/hooks/usePipelineStats'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { ShortcutCard } from '@/components/ui/ShortcutCard'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/providers/I18nProvider'

function SearchContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [filters, setFilters] = useState<{
    sector?: string
    region?: string
    city?: string
    query?: string
  }>({})
  const [hasSearched, setHasSearched] = useState(false)

  // AI B2B chat state
  type ChatMsg = { role: 'user' | 'assistant'; text: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: t('search.aiGreeting') },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Pipeline stats
  const pipelineStats = usePipelineStats()
  const stats = pipelineStats.data

  useEffect(() => {
    const sector = searchParams.get('sector') || undefined
    const region = searchParams.get('region') || undefined
    const city   = searchParams.get('city')   || undefined
    const query  = searchParams.get('query')  || undefined
    if (sector || region || city || query) {
      setFilters({ sector, region, city, query })
      setHasSearched(true)
    }
  }, [searchParams])

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChatMessage(msg: string) {
    if (!msg.trim() || isSendingChat) return
    const userMsg = msg.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setIsSendingChat(true)
    try {
      const token = await user?.getIdToken()
      const history = chatMessages
        .filter((m) => m.role !== 'assistant' || m !== chatMessages[0])
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }))
      // Envoyer le profil utilisateur pour contextualiser l'IA
      const userProfile = user
        ? {
            name:    (user as { name?: string }).name    ?? undefined,
            sector:  (user as { sector?: string }).sector  ?? undefined,
            company: (user as { companyName?: string }).companyName ?? undefined,
            region:  (user as { region?: string }).region  ?? undefined,
          }
        : undefined
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMsg, history, userProfile }),
      })
      const json = await res.json()
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: json.reply ?? json.error ?? 'Erreur de réponse.' },
      ])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: '❌ Erreur réseau. Vérifiez votre connexion.' }])
    } finally {
      setIsSendingChat(false)
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage(chatInput)
    }
  }

  const searchQuery = useCompaniesSearch(filters)
  const results = searchQuery.data ?? []

  return (
    <AppShell>
      {/* Barre de recherche — pas de carte, fond neutre */}
      <div style={{ paddingBottom: 8, marginBottom: 4 }}>
        <SearchFiltersForm
          initialValues={filters}
          onSubmit={(v) => {
            setFilters(v)
            setHasSearched(true)
          }}
        />
      </div>


      <div 
        className="search-page-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: 24, 
          alignItems: 'start' 
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Résultats */}
        {hasSearched ? (
          <DataCard
            title={t('search.results')}
            subtitle={
              !searchQuery.isLoading && !searchQuery.isError
                ? `${results.length} ${t('search.companiesFound')}`
                : undefined
            }
            actions={<SaveCurrentSearchButton filters={filters} results={results} />}
          >
            {searchQuery.isLoading ? <LoadingState title={t('search.loadingSearch')} /> : null}
            {searchQuery.isError ? (
              <div style={{
                padding: '12px 16px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444', fontSize: 13,
              }}>
                {(searchQuery.error as Error)?.message?.includes('429') || (searchQuery.error as Error)?.message?.includes('Quota')
                  ? t('search.quotaExceeded')
                  : t('search.searchError')
                }
              </div>
            ) : null}
            {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 ? (
              <EmptyState
                title={t('search.noResult')}
                description={t('search.noResultDesc')}
                icon="🔍"
              />
            ) : null}
            {!searchQuery.isLoading && !searchQuery.isError && results.length > 0 ? (
              <CompaniesSearchResults items={results} />
            ) : null}
          </DataCard>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 16px',
              textAlign: 'center',
              gap: 32,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Illustration SVG Custom (Cameroun + Réseau + Loupe + Pulse) */}
              <div 
                style={{ 
                  position: 'relative',
                  width: 140, 
                  height: 140, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: colors.greenLight,
                  animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
                  opacity: 0.5
                }} />
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.2; }
                  }
                `}} />
                
                <svg width="100" height="100" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 1 }}>
                  {/* Carte abstraite Cameroun (forme stylisée) */}
                  <path d="M70 40 L100 20 L130 50 L140 90 L120 140 L80 160 L50 120 L40 80 Z" fill={colors.border2} stroke={colors.border} strokeWidth="2" strokeLinejoin="round"/>
                  
                  {/* Nœuds réseau d'entreprises */}
                  <circle cx="80" cy="60" r="6" fill={colors.green} />
                  <circle cx="110" cy="80" r="8" fill={colors.greenDark} />
                  <circle cx="90" cy="110" r="5" fill={colors.green} />
                  <circle cx="120" cy="120" r="7" fill={colors.green} />
                  <circle cx="60" cy="100" r="4" fill={colors.green} />
                  
                  {/* Lignes de connexion réseau */}
                  <path d="M80 60 L110 80 L120 120 L90 110 Z" stroke={colors.green} strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M80 60 L60 100 L90 110" stroke={colors.green} strokeWidth="1.5" strokeDasharray="4 4" />
                  
                  {/* Loupe */}
                  <circle cx="130" cy="140" r="24" fill="none" stroke={colors.text} strokeWidth="6" />
                  <line x1="147" y1="157" x2="170" y2="180" stroke={colors.text} strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Commercial (silhouette) dans la loupe */}
                  <circle cx="130" cy="135" r="8" fill={colors.textMid} />
                  <path d="M118 152 C118 145 142 145 142 152" stroke={colors.textMid} strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', paddingLeft: 8, paddingRight: 8 }}>
                <h2 style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: colors.text, margin: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {t('search.findIdealProspects')}
                </h2>
                <p style={{ color: colors.textMid, fontSize: 'clamp(13px, 3.5vw, 15px)', maxWidth: 400, margin: '0 auto', wordBreak: 'break-word' }}>
                  {t('search.findIdealProspectsDesc')}
                </p>
              </div>

              <Button 
                variant="primary" 
                size="md" 
                onClick={() => {
                  const input = document.getElementById('main-search-input')
                  if (input) input.focus()
                }}
                style={{ marginTop: 8 }}
              >
                {t('search.startFirstSearch')}
              </Button>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              @media (max-width: 640px) {
                .shortcut-grid {
                  max-width: 100%;
                  gap: 10px;
                }
                .shortcut-grid > *:nth-child(n+3) {
                  display: none;
                }
              }
            `}} />

            {/* Grille de Raccourcis */}
            <div 
              className="shortcut-grid"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 12, 
                width: '100%', 
                maxWidth: 600 
              }}
            >
              <ShortcutCard 
                sector="btp" 
                title={t('search.btpDouala')}
                subtitle={t('search.newCompanies')}
                onClick={() => { setFilters({ sector: 'BTP', city: 'Douala' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="tech" 
                title={t('search.techYaounde')}
                subtitle={t('search.startupsPme')}
                onClick={() => { setFilters({ sector: 'Tech', city: 'Yaoundé' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="agro" 
                title={t('search.agro')}
                subtitle={t('search.allCameroon')}
                onClick={() => { setFilters({ sector: 'Agroalimentaire' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="transport" 
                title={t('search.transport')}
                subtitle={t('search.allCameroon')}
                onClick={() => { setFilters({ sector: 'Transport' }); setHasSearched(true) }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Colonne de Droite : Pipeline & Assistant (Desktop uniquement) */}
      <div 
        className="desktop-only-panels"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 20,
          minWidth: 300,
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 1024px) {
            .desktop-only-panels { display: none !important; }
            .search-page-grid { grid-template-columns: 1fr !important; }
          }
        `}} />

        {/* Pipeline commercial */}
        <DataCard title={t('search.commercialPipeline')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stats live */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: t('search.prospection'), value: stats?.prospection ?? 0, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
                { label: t('search.negotiation'), value: stats?.negotiation ?? 0, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                { label: t('search.conclusion'),  value: stats?.conclusion  ?? 0, color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: colors.textMid, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              style={{ width: '100%', borderRadius: 8 }}
              onClick={() => router.push('/pipeline')}
            >
              {t('search.myPipelineFull')}
            </Button>
          </div>
        </DataCard>

        {/* Assistant B2B IA */}
        <DataCard title={t('search.aiAssistant')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 380 }}>
            {/* Zone messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingRight: 4,
              maxHeight: 260,
            }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user'
                      ? colors.green
                      : colors.greenLight,
                    color: msg.role === 'user' ? '#fff' : colors.greenDark,
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {isSendingChat && (
                <div style={{ alignSelf: 'flex-start', background: colors.greenLight, color: colors.greenDark, padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 12, fontStyle: 'italic' }}>
                  {t('search.aiThinking')}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chips suggestions — adaptées au secteur de l'utilisateur */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(() => {
                const sector = (user as { sector?: string } | null)?.sector
                const chips = sector
                  ? [
                      `Tendances ${sector}`,
                      `Email d'approche ${sector}`,
                      `Script appel DG ${sector}`,
                    ]
                  : [
                      'Tendances BTP Douala',
                      "Email d'approche Tech",
                      'Script appel DG Agroalimentaire',
                    ]
                return chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendChatMessage(chip)}
                    disabled={isSendingChat}
                    style={{
                      fontSize: 11,
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: `1px solid ${colors.border}`,
                      background: colors.bg2,
                      color: colors.textMid,
                      cursor: isSendingChat ? 'not-allowed' : 'pointer',
                      opacity: isSendingChat ? 0.5 : 1,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {chip}
                  </button>
                ))
              })()}
            </div>

            {/* Zone de saisie */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={isSendingChat}
                placeholder={t('search.aiPlaceholder')}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 48px 10px 14px',
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  outline: 'none',
                  fontSize: 12.5,
                  resize: 'none',
                  fontFamily: 'inherit',
                  background: colors.bg2,
                  color: colors.text,
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => sendChatMessage(chatInput)}
                disabled={isSendingChat || !chatInput.trim()}
                style={{
                  position: 'absolute',
                  right: 8,
                  bottom: 8,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isSendingChat || !chatInput.trim() ? colors.border : colors.green,
                  color: '#fff',
                  border: 'none',
                  cursor: isSendingChat || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(27,122,62,0.3)',
                  transition: 'all 200ms ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </DataCard>
      </div>
      </div>
    </AppShell>
  )
}

export default function SearchPage() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>{t('search.loadingSearch')}</div>}>
      <SearchContent />
    </Suspense>
  )
}
