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
    lat?: string
    lng?: string
    radius?: string
  }>({})
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isBackAction, setIsBackAction] = useState(false)

  // Pipeline stats
  const pipelineStats = usePipelineStats()
  const stats = pipelineStats.data

  // AI B2B chat state
  type ChatMsg = { role: 'user' | 'assistant'; text: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: t('search.aiGreeting') }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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
          parts: [{ text: m.text }]
        }))
      // Envoyer le profil utilisateur pour contextualiser l'IA
      const userProfile = user
        ? {
            name: (user as { name?: string }).name ?? undefined,
            sector: (user as { sector?: string }).sector ?? undefined,
            company: (user as { companyName?: string }).companyName ?? undefined,
            region: (user as { region?: string }).region ?? undefined
          }
        : undefined
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: userMsg, history, userProfile })
      })
      const json = await res.json()
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: json.reply ?? json.error ?? 'Erreur de réponse.' }
      ])
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '❌ Erreur réseau. Vérifiez votre connexion.' }
      ])
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

  useEffect(() => {
    const sector = searchParams.get('sector') || undefined
    const region = searchParams.get('region') || undefined
    const city = searchParams.get('city') || undefined
    const query = searchParams.get('query') || undefined
    const lat = searchParams.get('lat') || undefined
    const lng = searchParams.get('lng') || undefined
    const radius = searchParams.get('radius') || undefined
    if (sector || region || city || query || lat || lng) {
      setFilters({ sector, region, city, query, lat, lng, radius })
      setHasSearched(true)
    }
  }, [searchParams])

  const searchQuery = useCompaniesSearch({ ...filters, page: currentPage, charge: !isBackAction })
  const searchData = searchQuery.data
  const results = searchData?.items ?? []
  const totalResults = searchData?.total ?? 0
  const totalPages = searchData?.totalPages ?? 0

  return (
    <AppShell>
      {/* Barre de recherche — pas de carte, fond neutre */}
      <div style={{ paddingBottom: 8, marginBottom: 4 }}>
        <SearchFiltersForm
          initialValues={filters}
          onSubmit={(v) => {
            setFilters(v)
            setCurrentPage(1)
            setIsBackAction(false)
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
          alignItems: 'start',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
          {/* Résultats */}
          {hasSearched ? (
            <DataCard
              title={t('search.results')}
              subtitle={
                !searchQuery.isLoading && !searchQuery.isError
                  ? `${totalResults} ${t('search.companiesFound')}`
                  : undefined
              }
              actions={<SaveCurrentSearchButton filters={filters} results={results} />}
            >
              {searchQuery.isLoading ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 96,
                        borderRadius: 12,
                        background: 'var(--color-bg2)',
                        border: '1px solid var(--color-border)',
                        opacity: 0.7,
                        animation: 'pulse 1.5s infinite ease-in-out'
                      }}
                    />
                  ))}
                </div>
              ) : null}
              {searchQuery.isError ? (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    fontSize: 13
                  }}
                >
                  {(searchQuery.error as Error)?.message?.includes('429') ||
                  (searchQuery.error as Error)?.message?.includes('Quota')
                    ? t('search.quotaExceeded')
                    : t('search.searchError')}
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
                <>
                  <CompaniesSearchResults items={results} />

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || searchQuery.isLoading}
                        onClick={() => {
                          setIsBackAction(true)
                          setCurrentPage((p) => Math.max(1, p - 1))
                          document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {t('common.previous' as any) || 'Précédent'}
                      </Button>

                      <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)', fontWeight: 600 }}>
                        Page {currentPage} / {totalPages}
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={currentPage >= totalPages || searchQuery.isLoading}
                        onClick={() => {
                          setIsBackAction(false)
                          setCurrentPage((p) => p + 1)
                          document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {t('common.next' as any) || 'Suivant'}
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </DataCard>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 8px',
                textAlign: 'center',
                gap: 16,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 12,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* Illustration Desktop (Premium) */}
                <div
                  className="desktop-illustration"
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 360,
                    height: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    background: `radial-gradient(50% 50% at 50% 50%, ${'rgba(34,197,94,0.1)'} 0%, transparent 100%)`
                  }}
                >
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                  @keyframes floatSubtle {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-8px) scale(1.02); }
                  }
                  @keyframes pulseSimple {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.2; }
                  }
                  .illustration-refined {
                    animation: floatSubtle 6s infinite ease-in-out;
                    transition: all 0.3s ease;
                  }

                  /* Mode Clair : le fond blanc de l'image se fond parfaitement dans la page */
                  :root:not(.dark) .illustration-refined,
                  html:not(.dark) .illustration-refined,
                  [data-theme='light'] .illustration-refined {
                    mix-blend-mode: multiply;
                  }

                  /* Mode Sombre : l'image est encapsulée dans une carte UI élégante aux coins arrondis */
                  .dark .desktop-illustration,
                  [data-theme='dark'] .desktop-illustration {
                    background: #ffffff !important;
                    border-radius: 20px !important;
                    padding: 12px !important;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
                    overflow: hidden !important;
                  }
                  .dark .illustration-refined,
                  [data-theme='dark'] .illustration-refined {
                    border-radius: 12px !important;
                  }

                  .mobile-illustration { display: none; }
                  @media (max-width: 768px) {
                    .desktop-illustration { display: none !important; }
                    .mobile-illustration { display: flex !important; }
                  }
                `
                    }}
                  />

                  <img
                    src="/illustrations/search-prospects.png"
                    alt="Prospection B2B au Cameroun — Trouvez vos clients avec Sales Companion"
                    className="illustration-refined"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      opacity: 0.95
                    }}
                  />
                </div>

                {/* Illustration Mobile (Simplified SVG Pulse) */}
                <div
                  className="mobile-illustration"
                  style={{
                    position: 'relative',
                    width: 100,
                    height: 100,
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(34,197,94,0.1)',
                      animation: 'pulseSimple 2s infinite ease-in-out',
                      opacity: 0.5
                    }}
                  />
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 200 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ zIndex: 1 }}
                  >
                    <path
                      d="M70 40 L100 20 L130 50 L140 90 L120 140 L80 160 L50 120 L40 80 Z"
                      fill="rgba(255,255,255,0.07)"
                      stroke={'var(--border, rgba(255,255,255,0.1))'}
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="80" cy="60" r="5" fill={'#4ade80'} />
                    <circle cx="110" cy="80" r="7" fill={'#16a34a'} />
                    <circle cx="90" cy="110" r="4" fill={'#4ade80'} />
                    <circle cx="120" cy="120" r="6" fill={'#4ade80'} />
                    <circle cx="60" cy="100" r="3" fill={'#4ade80'} />
                    <path
                      d="M80 60 L110 80 L120 120 L90 110 Z"
                      stroke={'#4ade80'}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx="130"
                      cy="140"
                      r="20"
                      fill="none"
                      stroke={'var(--foreground, #f1f5f9)'}
                      strokeWidth="5"
                    />
                    <line
                      x1="145"
                      y1="155"
                      x2="165"
                      y2="175"
                      stroke={'var(--foreground, #f1f5f9)'}
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <circle cx="130" cy="135" r="8" fill={'var(--muted-foreground, #94a3b8)'} />
                    <path
                      d="M118 152 C118 145 142 145 142 152"
                      stroke={'var(--muted-foreground, #94a3b8)'}
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    width: '100%',
                    paddingLeft: 8,
                    paddingRight: 8
                  }}
                >
                  <h2
                    style={{
                      fontSize: 'clamp(18px, 5vw, 24px)',
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)',
                      margin: 0,
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {t('search.findIdealProspects')}
                  </h2>
                  <p
                    style={{
                      color: 'var(--muted-foreground, #94a3b8)',
                      fontSize: 'clamp(13px, 3.5vw, 15px)',
                      maxWidth: 400,
                      margin: '0 auto',
                      wordBreak: 'break-word'
                    }}
                  >
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

              <style
                dangerouslySetInnerHTML={{
                  __html: `
            @media (max-width: 640px) {
              .shortcut-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                display: grid !important;
                gap: 10px !important;
                padding: 0 !important;
                margin: 0 auto !important;
                overflow: visible !important;
              }
            }
            `
                }}
              />

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
                  onClick={() => {
                    setFilters({ sector: 'BTP & Construction', city: 'Douala' })
                    setHasSearched(true)
                  }}
                />
                <ShortcutCard
                  sector="tech"
                  title={t('search.techYaounde')}
                  subtitle={t('search.startupsPme')}
                  onClick={() => {
                    setFilters({ sector: 'Technologies & Numérique', city: 'Yaoundé' })
                    setHasSearched(true)
                  }}
                />
                <ShortcutCard
                  sector="agro"
                  title={t('search.agro')}
                  subtitle={t('search.allCameroon')}
                  onClick={() => {
                    setFilters({ sector: 'Agriculture & Agroalimentaire' })
                    setHasSearched(true)
                  }}
                />
                <ShortcutCard
                  sector="transport"
                  title={t('search.transport')}
                  subtitle={t('search.allCameroon')}
                  onClick={() => {
                    setFilters({ sector: 'Transport & Logistique' })
                    setHasSearched(true)
                  }}
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
            position: 'sticky',
            top: 88,
            maxHeight: 'calc(100vh - 116px)',
            overflowY: 'auto',
            paddingRight: 4
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
          @media (max-width: 1024px) {
            .desktop-only-panels { display: none !important; }
            .search-page-grid { grid-template-columns: 1fr !important; }
          }
        `
            }}
          />

          {/* Pipeline commercial */}
          <DataCard
            title={t('search.commercialPipeline')}
            style={{
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Stats live */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  {
                    label: t('search.prospection'),
                    value: stats?.prospection ?? 0,
                    textClass: 'text-blue-600 dark:text-blue-400',
                    bgClass: 'bg-blue-500/10 border-blue-500/20'
                  },
                  {
                    label: t('search.negotiation'),
                    value: stats?.negotiation ?? 0,
                    textClass: 'text-amber-600 dark:text-amber-400',
                    bgClass: 'bg-amber-500/10 border-amber-500/20'
                  },
                  {
                    label: t('search.conclusion'),
                    value: stats?.conclusion ?? 0,
                    textClass: 'text-emerald-600 dark:text-emerald-400',
                    bgClass: 'bg-emerald-500/10 border-emerald-500/20'
                  }
                ].map(({ label, value, textClass, bgClass }) => (
                  <div
                    key={label}
                    className={`rounded-xl border p-2.5 text-center ${bgClass}`}
                  >
                    <div className={`text-[22px] font-extrabold ${textClass}`}>{value}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</div>
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
          {user?.plan !== 'free' && (
            <DataCard
              title={t('search.aiAssistant')}
              style={{
                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 380 }}>
                {/* Zone messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    paddingRight: 4,
                    maxHeight: 260
                  }}
                >
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={
                        msg.role === 'user'
                          ? 'self-end max-w-[85%] rounded-[16px_16px_4px_16px] bg-primary px-3.5 py-2.5 text-[12.5px] leading-relaxed text-primary-foreground shadow-sm'
                          : 'self-start max-w-[85%] rounded-[16px_16px_16px_4px] border border-border bg-secondary/80 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground shadow-sm'
                      }
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {isSendingChat && (
                    <div className="self-start rounded-[16px_16px_16px_4px] border border-border bg-secondary/60 px-3.5 py-2.5 text-[12px] italic text-muted-foreground">
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
                          `Script appel DG ${sector}`
                        ]
                      : [
                          'Tendances BTP Douala',
                          "Email d'approche Tech",
                          'Script appel DG Agroalimentaire'
                        ]
                    return chips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => sendChatMessage(chip)}
                        disabled={isSendingChat}
                        className="cursor-pointer rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
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
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 48px 10px 14px',
                      borderRadius: 14,
                      border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                      outline: 'none',
                      fontSize: 12.5,
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: 'var(--card, #131c2e)',
                      color: 'var(--foreground, #f1f5f9)',
                      boxSizing: 'border-box'
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
                      background: isSendingChat || !chatInput.trim() ? 'var(--border, rgba(255,255,255,0.1))' : '#4ade80',
                      color: '#fff',
                      border: 'none',
                      cursor: isSendingChat || !chatInput.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,85,255,0.3)',
                      transition: 'all 200ms ease'
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </DataCard>
          )}
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
