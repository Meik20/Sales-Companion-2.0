'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useTranslation } from '@/providers/I18nProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { GEOGRAPHY } from '@sales-companion/shared'
import {
  Search,
  HardHat,
  ShoppingBag,
  Laptop,
  Sprout,
  Truck,
  Stethoscope,
  LayoutGrid,
  Home,
  X
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────
const REGION_KEYS: Record<string, string> = {
  Adamaoua: 'adamaoua',
  Centre: 'centre',
  Est: 'est',
  'Extrême-Nord': 'extremeNord',
  Littoral: 'littoral',
  Nord: 'nord',
  'Nord-Ouest': 'nordOuest',
  Ouest: 'ouest',
  Sud: 'sud',
  'Sud-Ouest': 'sudOuest'
}

const SECTORS = [
  'Commerce',
  'BTP & Construction',
  'Industrie manufacturière',
  'Agriculture & Agroalimentaire',
  'Services & Conseil',
  'Transport & Logistique',
  'Hôtellerie & Restauration',
  'Santé',
  'Éducation & Formation',
  'Technologies & Numérique',
  'Finance & Assurance',
  'Énergie & Mines'
]
const SECTOR_KEYS: Record<string, string> = {
  Commerce: 'commerce',
  'BTP & Construction': 'btp',
  'Industrie manufacturière': 'industrie',
  'Agriculture & Agroalimentaire': 'agro',
  'Services & Conseil': 'services',
  'Transport & Logistique': 'transport',
  'Hôtellerie & Restauration': 'hotellerie',
  Santé: 'sante',
  'Éducation & Formation': 'education',
  'Technologies & Numérique': 'tech',
  'Finance & Assurance': 'finance',
  'Énergie & Mines': 'energie'
}

const QUICK_SECTORS = [
  { labelKey: 'search.quickAll', value: '', icon: LayoutGrid, count: null },
  { labelKey: 'search.btp', value: 'BTP & Construction', icon: HardHat, count: 86 },
  { labelKey: 'search.commerce', value: 'Commerce', icon: ShoppingBag, count: 142 },
  { labelKey: 'search.tech', value: 'Technologies & Numérique', icon: Laptop, count: 94 },
  { labelKey: 'search.agro', value: 'Agriculture & Agroalimentaire', icon: Sprout, count: 78 },
  { labelKey: 'search.transport', value: 'Transport & Logistique', icon: Truck, count: 124 },
  { labelKey: 'search.sante', value: 'Santé', icon: Stethoscope, count: 46 }
]

const CAMEROON_ZONES = [
  { region: 'Littoral', city: 'Douala', lat: 4.05, lng: 9.7 },
  { region: 'Centre', city: 'Yaoundé', lat: 3.87, lng: 11.52 },
  { region: 'Ouest', city: 'Bafoussam', lat: 5.48, lng: 10.42 },
  { region: 'Nord-Ouest', city: 'Bamenda', lat: 5.96, lng: 10.16 },
  { region: 'Sud-Ouest', city: 'Buea', lat: 4.15, lng: 9.24 },
  { region: 'Adamaoua', city: 'Ngaoundéré', lat: 7.33, lng: 13.58 },
  { region: 'Nord', city: 'Garoua', lat: 9.3, lng: 13.4 },
  { region: 'Extrême-Nord', city: 'Maroua', lat: 10.6, lng: 14.33 },
  { region: 'Est', city: 'Bertoua', lat: 4.58, lng: 13.68 },
  { region: 'Sud', city: 'Ebolowa', lat: 2.9, lng: 11.15 }
]

function nearestZone(lat: number, lng: number) {
  let best = CAMEROON_ZONES[0]
  let bestDist = Infinity
  for (const z of CAMEROON_ZONES) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) {
      bestDist = d
      best = z
    }
  }
  return best!
}

type Filters = {
  sector?: string
  region?: string
  city?: string
  query?: string
  lat?: string
  lng?: string
  radius?: string
}
type Props = { initialValues?: Filters; onSubmit: (v: Filters) => void; onHome?: () => void }

// ─── Component ───────────────────────────────────────────────────────────────
export function SearchFiltersForm({ initialValues = {}, onSubmit, onHome }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  // Pays de prospection actif : cookie sc_country (landing) > user.country (Firestore)
  const userCountry = useProspectingCountry()
  const geography = GEOGRAPHY[userCountry] ?? GEOGRAPHY.CM!
  const regions = geography.regions
  const [query, setQuery] = useState(initialValues.query ?? '')
  const [sector, setSector] = useState(initialValues.sector ?? '')
  const [region, setRegion] = useState(initialValues.region ?? '')
  const [city, setCity] = useState(initialValues.city ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [geoMsg, setGeoMsg] = useState('')

  // Cities available for the selected region
  const availableCities = region ? (geography.citiesByRegion[region] ?? []) : []

  useEffect(() => {
    setQuery(initialValues.query ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city ?? '')
  }, [initialValues.query, initialValues.sector, initialValues.region, initialValues.city])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const el = document.getElementById('main-search-input') as HTMLInputElement | null
        if (el) {
          el.focus()
          el.select()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleRegionChange(r: string) {
    setRegion(r)
    setCity('') // always reset city when region changes
  }

  function submit(overrides: Partial<Filters> = {}) {
    onSubmit({
      query: (overrides.query ?? query) || undefined,
      sector: (overrides.sector ?? sector) || undefined,
      region: (overrides.region ?? region) || undefined,
      city: (overrides.city ?? city) || undefined
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleReset() {
    setQuery('')
    setSector('')
    setRegion('')
    setCity('')
    setGeoState('idle')
    setGeoMsg('')
    onSubmit({})
  }

  function applyQuickSector(value: string) {
    setSector(value)
    onSubmit({
      query: query || undefined,
      sector: value || undefined,
      region: region || undefined,
      city: city || undefined
    })
  }

  function handleLocateMe() {
    if (userCountry !== 'CM') {
      setGeoState('error')
      setGeoMsg(t('search.locationUnavailable'))
      return
    }
    if (!navigator.geolocation) {
      setGeoState('error')
      setGeoMsg(t('search.locationNotSupported'))
      return
    }
    setGeoState('loading')
    setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(z.region)
        setCity(z.city)
        setGeoState('done')
        setGeoMsg(`${z.city} (${z.region})`)
        onSubmit({
          query: query || undefined,
          sector: sector || undefined,
          region: z.region,
          city: z.city,
          lat: pos.coords.latitude.toString(),
          lng: pos.coords.longitude.toString(),
          radius: '10000' // Default 10km radius
        })
      },
      (err) => {
        setGeoState('error')
        setGeoMsg(err.code === 1 ? t('search.locationDenied') : t('search.locationUnavailable'))
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }

  const hasFilters = !!(query || sector || region || city)

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* ── Search bar block ── */
        .sc-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .sc-filters-container {
          width: 100%;
          background: transparent;
        }
        .sc-input-wrap {
          flex: 1;
          min-width: 0;
          position: relative;
        }
        .sc-input-wrap svg.sc-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--muted-foreground);
        }
        .sc-input {
          width: 100%;
          height: 44px;
          padding: 0 54px 0 42px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--foreground);
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }
        .sc-kbd {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted-foreground);
          background: var(--muted);
          border: 1px solid var(--border);
          border-radius: 4px;
          pointer-events: none;
          line-height: 1.2;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .sc-input::placeholder {
          color: var(--muted-foreground);
          opacity: 0.8;
        }
        .sc-input:focus {
          border-color: #2F5BEA;
          box-shadow: 0 0 0 3px rgba(47, 91, 234, 0.15);
        }
        .sc-submit-btn {
          height: 44px;
          padding: 0 18px;
          border-radius: 8px;
          background: #2F5BEA;
          color: #fff;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 150ms ease, transform 100ms ease;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }
        .sc-submit-btn:hover {
          background: #1e40af;
        }
        .sc-submit-btn:active {
          transform: scale(0.98);
        }
        .sc-submit-btn svg {
          width: 15px;
          height: 15px;
          stroke: currentColor;
        }
        .sc-submit-btn svg {
          width: 18px;
          height: 18px;
          stroke: currentColor;
        }

        /* ── Pill row ── */
        .sc-pills-row {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          width: 100%;
          min-width: 0;
        }
        .sc-pills-scroll {
          flex: 1;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
          margin-right: 6px;
          width: 100%;
          min-width: 0;
        }
        .sc-pills-scroll::-webkit-scrollbar { display: none; }
        .sc-pills-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sc-pills {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          min-width: 100%;
        }
        .sc-pill {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 12px;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
          font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: all 150ms ease; white-space: nowrap;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
        }
        .sc-pill:hover { border-color: #2F5BEA; color: #2F5BEA; }
        .sc-pill.active {
          border-color: #2F5BEA;
          background: #2F5BEA;
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(47, 91, 234, 0.25);
        }
        .sc-pill-counter {
          font-size: 11px;
          opacity: 0.65;
          font-weight: 500;
        }
        .sc-pill.active .sc-pill-counter {
          opacity: 0.9;
          color: #fff;
        }
        /* ── Bouton Accueil ── */
        .sc-home-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 30px; padding: 0 12px;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--muted-foreground);
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 150ms ease; white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
        }
        .sc-home-btn:hover {
          border-color: #2F5BEA;
          color: #2F5BEA;
        }
        .sc-adv-btn:hover { color: var(--color-primary); }
        .sc-adv-chevron { transition: transform 200ms ease; }
        .sc-adv-chevron.open { transform: rotate(180deg); }

        /* ── Advanced panel ── */
        .sc-adv-panel {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 16px;
          border-radius: 10px;
          background: var(--bg2);
          border: 1.5px solid var(--bd);
          animation: sc-fadein 160ms ease;
        }
        @keyframes sc-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sc-adv-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .sc-adv-field label {
          display: block; font-size: 11px; font-weight: 600;
          color: var(--tx2);
          text-transform: uppercase; letter-spacing: .05em;
          margin-bottom: 4px;
        }
        .sc-adv-select {
          width: 100%; height: 36px; padding: 0 10px;
          border: 1.5px solid var(--bd);
          border-radius: 8px;
          background: var(--bg);
          color: var(--tx);
          font-size: 12.5px; font-family: inherit;
          outline: none; cursor: pointer;
          transition: border-color 150ms ease;
        }
        .sc-adv-select:focus { border-color: var(--color-primary); }
        .sc-adv-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .sc-adv-select option { background: var(--bg2); color: var(--tx); }
        .sc-geo-btn {
          height: 36px; padding: 0 14px;
          border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          background: rgba(0,85,255,0.07);
          border: 1.5px solid rgba(0,85,255,0.25);
          color: var(--color-primary);
          display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: all 150ms ease; white-space: nowrap; width: 100%;
        }
        .sc-geo-btn:hover { background: rgba(0,85,255,0.13); }
        .sc-geo-btn.done { background: rgba(0,85,255,0.13); border-color: rgba(0,85,255,0.5); }
        .sc-geo-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Active chips ── */
        .sc-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .sc-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; padding: 3px 10px; border-radius: 999px;
          background: var(--color-primary);
          border: 1px solid var(--color-primary);
          color: #fff; font-weight: 600;
        }
        .sc-chip button {
          background: none; border: none; cursor: pointer;
          padding: 0; color: inherit; font-size: 11px; line-height: 1;
          display: flex; align-items: center; opacity: 0.7;
        }
        .sc-chip button:hover { opacity: 1; }
        .sc-reset-btn {
          display: inline-flex; align-items: center; gap: 4px;
          height: 26px; padding: 0 10px; border-radius: 8px;
          background: transparent;
          border: 1px solid var(--bd);
          color: var(--tx2);
          font-size: 11.5px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: all 150ms ease;
        }
        .sc-reset-btn:hover { background: rgba(0,0,0,0.04); }

        /* ── Geo feedback badge ── */
        .sc-geo-msg {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; padding: 5px 12px; border-radius: 8px;
        }

        @media (max-width: 640px) {
          .sc-submit-btn { flex: 0 0 46px; width: 46px; min-width: 46px; }
          .sc-adv-row { grid-template-columns: 1fr 1fr; }
          .sc-adv-row .sc-adv-geo-col { grid-column: 1 / -1; }
        }
        @media (max-width: 420px) {
          .sc-adv-row { grid-template-columns: 1fr; }
        }
        /* City field animation */
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sc-city-field {
          animation: fadeSlideIn 200ms ease;
        }
      `
        }}
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="sc-filters-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* ── Block 1: Search bar ── */}
            <div className="sc-bar">
              <div className="sc-input-wrap">
                <Search className="sc-search-icon" size={15} />
                <input
                  id="main-search-input"
                  className="sc-input"
                  placeholder={t('search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd className="sc-kbd">⌘K</kbd>
              </div>
              <button type="submit" className="sc-submit-btn" aria-label="Lancer la recherche">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            {/* ── Block 2: Quick-sector pills + advanced toggle ── */}
            <div className="sc-pills-row">
              <div className="sc-pills-scroll">
                <div className="sc-pills">
                  {/* Bouton Accueil — réinitialise à la page d'accueil de recherche */}
                  {onHome && (
                    <button
                      type="button"
                      className="sc-home-btn"
                      onClick={onHome}
                      aria-label={t('search.goHome' as any) || 'Accueil'}
                    >
                      <Home size={13} style={{ flexShrink: 0 }} />
                      {t('search.goHome' as any) || 'Accueil'}
                    </button>
                  )}
                  {QUICK_SECTORS.map((s) => {
                    return (
                      <button
                        key={s.value}
                        type="button"
                        className={`sc-pill${sector === s.value ? ' active' : ''}`}
                        onClick={() => applyQuickSector(s.value)}
                      >
                        {s.icon && <s.icon size={14} style={{ flexShrink: 0 }} />}
                        {t(s.labelKey as any)}
                        {s.count !== null && <span className="sc-pill-counter"> · {s.count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Active filter chips — only shown when there are visible chips (not just sector) ── */}
            {!!(query || region || city) && (
              <div className="sc-chips">
                {query && (
                  <ActiveChip
                    label={`"${query}"`}
                    onRemove={() => {
                      setQuery('')
                      submit({ query: undefined })
                    }}
                  />
                )}
                {region && (
                  <ActiveChip
                    label={
                      REGION_KEYS[region] ? t(`regions.${REGION_KEYS[region]}` as any) : region
                    }
                    onRemove={() => {
                      setRegion('')
                      setCity('')
                      submit({ region: undefined, city: undefined })
                    }}
                  />
                )}
                {city && (
                  <ActiveChip
                    label={city}
                    onRemove={() => {
                      setCity('')
                      submit({ city: undefined })
                    }}
                  />
                )}
                <button type="button" className="sc-reset-btn" onClick={handleReset}>
                  {t('search.clearAll')}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="sc-chip">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${label}`}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </span>
  )
}
