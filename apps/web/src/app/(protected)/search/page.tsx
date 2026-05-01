'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { ErrorState } from '@/components/feedback/index'
import { DataCard, Badge } from '@/components/ui/index'
import { SearchFiltersForm } from '@/features/search/components/SearchFiltersForm'
import { CompaniesSearchResults } from '@/features/search/components/CompaniesSearchResults'
import { SaveCurrentSearchButton } from '@/features/search/components/SaveCurrentSearchButton'
import { useCompaniesSearch } from '@/features/search/hooks/useCompaniesSearch'
import { colors } from '@/styles/tokens'
import { ShortcutCard } from '@/components/ui/ShortcutCard'
import { Button } from '@/components/ui/Button'

function SearchContent() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<{
    sector?: string
    region?: string
    city?: string
    query?: string
  }>({})
  const [hasSearched, setHasSearched] = useState(false)

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

  const searchQuery = useCompaniesSearch(filters)
  const results = searchQuery.data ?? []

  return (
    <AppShell>
      <PageHeader
        title="Recherche"
        subtitle="Trouvez des entreprises camerounaises et constituez vos prospects."
        actions={<SaveCurrentSearchButton filters={filters} results={results} />}
      />

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
        {/* Filtres */}
        <DataCard title="Filtres de recherche">
          <SearchFiltersForm
            initialValues={filters}
            onSubmit={(v) => {
              setFilters(v)
              setHasSearched(true)
            }}
          />
        </DataCard>

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
        <DataCard title="Pipeline commercial">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', background: '#FFF3E0', padding: 8, borderRadius: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E65100' }}>🎯 Prospection <Badge variant="danger">0</Badge></span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: colors.textMid }}>🤝 Négociation <Badge variant="info">0</Badge></span>
              <span style={{ fontSize: 12, color: colors.textMid }}>✅ Conclue <Badge variant="success">0</Badge></span>
            </div>
            <Button variant="primary" style={{ width: '100%', borderRadius: 8 }}>+ Ajouter une entreprise</Button>
          </div>
        </DataCard>

        {/* Assistant B2B */}
        <DataCard title="🟢 Assistant IA B2B">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 350 }}>
            {/* Zone de messages (scrollable) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
              <div style={{ 
                background: colors.greenLight, 
                padding: '12px 16px', 
                borderRadius: '16px 16px 16px 4px', 
                fontSize: 13, 
                color: colors.greenDark,
                lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(27,122,62,0.05)'
              }}>
                <strong>Bonjour 👋 Je suis votre Assistant IA B2B.</strong><br/>
                Posez-moi vos questions sur la prospection au Cameroun, les secteurs d'activité, ou demandez-moi de rédiger un email d'approche.
              </div>
            </div>

            {/* Suggestions rapides */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, border: `1px solid ${colors.border}`, background: '#fff', color: colors.textMid, cursor: 'pointer' }}>
                Tendances BTP Douala
              </button>
              <button style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, border: `1px solid ${colors.border}`, background: '#fff', color: colors.textMid, cursor: 'pointer' }}>
                Email d'approche Tech
              </button>
            </div>

            {/* Zone de saisie */}
            <div style={{ position: 'relative', marginTop: 'auto' }}>
              <textarea 
                placeholder="Ex: Comment aborder un DG dans l'Agroalimentaire ?" 
                rows={2}
                style={{ 
                  width: '100%', 
                  padding: '12px 48px 12px 16px', 
                  borderRadius: 16, 
                  border: `1px solid ${colors.border2}`, 
                  outline: 'none',
                  fontSize: 13,
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
                }} 
              />
              <button style={{ 
                position: 'absolute', 
                right: 8, 
                bottom: 8, 
                width: 32, 
                height: 32,
                borderRadius: '50%', 
                background: colors.green, 
                color: '#fff', 
                border: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(27,122,62,0.3)',
                transition: 'transform 200ms'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
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
