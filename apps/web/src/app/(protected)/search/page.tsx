'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { ErrorState } from '@/components/feedback/index'
import { DataCard, Badge } from '@/components/ui/index'
import { SearchFiltersForm } from '@/features/search/components/SearchFiltersForm'
import { CompaniesSearchResults } from '@/features/search/components/CompaniesSearchResults'
import { SaveCurrentSearchButton } from '@/features/search/components/SaveCurrentSearchButton'
import { useCompaniesSearch } from '@/features/search/hooks/useCompaniesSearch'
import { usePipelineStats } from '@/features/pipeline/hooks/usePipelineStats'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { ShortcutCard } from '@/components/ui/ShortcutCard'
import { Button } from '@/components/ui/Button'

function SearchContent() {
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
    { role: 'assistant', text: 'Bonjour 👋 Je suis votre Assistant IA B2B.\nPosez-moi vos questions sur la prospection au Cameroun, les secteurs d\'activité, ou demandez-moi de rédiger un email d\'approche.' },
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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMsg, history }),
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
      <PageHeader
        title="Recherche"
        subtitle="Trouvez des entreprises camerounaises et constituez vos prospects."
        actions={<SaveCurrentSearchButton filters={filters} results={results} />}
      />

      {/* Barre de recherche compacte — inline sous le header */}
      <div style={{
        background: 'var(--cr-card-background-color)',
        border: '1px solid var(--cr-separator-color)',
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 20,
      }}>
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
            title="Résultats"
            subtitle={
              !searchQuery.isLoading && !searchQuery.isError
                ? `${results.length} entreprise${results.length !== 1 ? 's' : ''} trouvée${results.length !== 1 ? 's' : ''}`
                : undefined
            }
          >
            {searchQuery.isLoading ? <LoadingState title="Recherche en cours…" /> : null}
            {searchQuery.isError ? (
              <ErrorState description="Impossible d'exécuter la recherche." />
            ) : null}
            {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Essayez d'élargir vos critères de recherche."
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>
                  Trouvez vos prospects idéaux
                </h2>
                <p style={{ color: colors.textMid, fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
                  Recherchez par nom, secteur, ville ou utilisez les filtres rapides ci-dessous pour démarrer.
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
                Lancez votre première recherche →
              </Button>
            </div>

            {/* Grille de Raccourcis */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16, 
                width: '100%', 
                maxWidth: 600 
              }}
            >
              <ShortcutCard 
                sector="btp" 
                title="BTP Douala" 
                subtitle="Nouvelles entreprises" 
                onClick={() => { setFilters({ sector: 'BTP', city: 'Douala' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="tech" 
                title="Tech Yaoundé" 
                subtitle="Startups & PME" 
                onClick={() => { setFilters({ sector: 'Tech', city: 'Yaoundé' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="agro" 
                title="Agroalimentaire" 
                subtitle="Tout Cameroun" 
                onClick={() => { setFilters({ sector: 'Agroalimentaire' }); setHasSearched(true) }} 
              />
              <ShortcutCard 
                sector="transport" 
                title="Transport" 
                subtitle="Tout Cameroun" 
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
        <DataCard title="📊 Pipeline commercial">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stats live */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Prospection', value: stats?.prospection ?? 0, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
                { label: 'Négociation', value: stats?.negotiation ?? 0, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                { label: 'Conclue',     value: stats?.conclusion  ?? 0, color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
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
              → Voir mon pipeline complet
            </Button>
          </div>
        </DataCard>

        {/* Assistant B2B IA */}
        <DataCard title="🟢 Assistant IA B2B">
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
                  ⏳ Réflexion en cours…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chips suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                'Tendances BTP Douala',
                "Email d'approche Tech",
                'Script appel DG Agroalimentaire',
              ].map((chip) => (
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
              ))}
            </div>

            {/* Zone de saisie */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={isSendingChat}
                placeholder="Ex: Comment aborder un DG dans l'Agroalimentaire ?  (Entrée pour envoyer)"
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
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement de la recherche...</div>}>
      <SearchContent />
    </Suspense>
  )
}
