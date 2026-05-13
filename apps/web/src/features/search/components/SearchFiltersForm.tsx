'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useTranslation } from '@/providers/I18nProvider'
import { 
  HardHat, 
  ShoppingBag, 
  Laptop, 
  Sprout, 
  Truck, 
  Stethoscope, 
  LayoutGrid 
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────
const REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
]
const REGION_KEYS: Record<string, string> = {
  'Adamaoua':    'adamaoua',
  'Centre':      'centre',
  'Est':         'est',
  'Extrême-Nord':'extremeNord',
  'Littoral':    'littoral',
  'Nord':        'nord',
  'Nord-Ouest':  'nordOuest',
  'Ouest':       'ouest',
  'Sud':         'sud',
  'Sud-Ouest':   'sudOuest',
}

const CITIES_BY_REGION: Record<string, string[]> = {
  'Adamaoua':    ['Ngaoundéré', 'Meiganga', 'Tibati', 'Ngaoundal', 'Banyo'],
  'Centre':      ['Yaoundé', 'Mbalmayo', 'Bafia', 'Eséka', 'Nanga-Eboko', 'Obala', 'Monatélé'],
  'Est':         ['Bertoua', 'Abong-Mbang', 'Batouri', 'Yokadouma', 'Dimako'],
  'Extrême-Nord':['Maroua', 'Mokolo', 'Kousseri', 'Yagoua', 'Mora'],
  'Littoral':    ['Douala', 'Nkongsamba', 'Edéa', 'Loum', 'Mbanga'],
  'Nord':        ['Garoua', 'Guider', 'Pitoa', 'Lagdo', 'Ngong'],
  'Nord-Ouest':  ['Bamenda', 'Kumbo', 'Wum', 'Mbengwi', 'Fundong'],
  'Ouest':       ['Bafoussam', 'Dschang', 'Mbouda', 'Foumban', 'Bangangté'],
  'Sud':         ['Ebolowa', 'Sangmélima', 'Kribi', 'Ambam', 'Lolodorf'],
  'Sud-Ouest':   ['Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko'],
}

const SECTORS = [
  'Commerce', 'BTP & Construction', 'Industrie manufacturière',
  'Agriculture & Agroalimentaire', 'Services & Conseil', 'Transport & Logistique',
  'Hôtellerie & Restauration', 'Santé', 'Éducation & Formation',
  'Technologies & Numérique', 'Finance & Assurance', 'Énergie & Mines',
]
const SECTOR_KEYS: Record<string, string> = {
  'Commerce':                      'commerce',
  'BTP & Construction':            'btp',
  'Industrie manufacturière':      'industrie',
  'Agriculture & Agroalimentaire': 'agro',
  'Services & Conseil':            'services',
  'Transport & Logistique':        'transport',
  'Hôtellerie & Restauration':     'hotellerie',
  'Santé':                         'sante',
  'Éducation & Formation':         'education',
  'Technologies & Numérique':      'tech',
  'Finance & Assurance':           'finance',
  'Énergie & Mines':               'energie',
}

const QUICK_SECTORS = [
  { labelKey: 'search.quickAll', value: '',                           icon: LayoutGrid },
  { labelKey: 'search.btp',      value: 'BTP & Construction',         icon: HardHat },
  { labelKey: 'search.commerce', value: 'Commerce',                   icon: ShoppingBag },
  { labelKey: 'search.tech',     value: 'Technologies & Numérique',   icon: Laptop },
  { labelKey: 'search.agro',     value: 'Agriculture & Agroalimentaire', icon: Sprout },
  { labelKey: 'search.transport',value: 'Transport & Logistique',     icon: Truck },
  { labelKey: 'search.sante',    value: 'Santé',                      icon: Stethoscope },
]

const CAMEROON_ZONES = [
  { region: 'Littoral',     city: 'Douala',     lat: 4.05,  lng: 9.70  },
  { region: 'Centre',       city: 'Yaoundé',    lat: 3.87,  lng: 11.52 },
  { region: 'Ouest',        city: 'Bafoussam',  lat: 5.48,  lng: 10.42 },
  { region: 'Nord-Ouest',   city: 'Bamenda',    lat: 5.96,  lng: 10.16 },
  { region: 'Sud-Ouest',    city: 'Buea',       lat: 4.15,  lng: 9.24  },
  { region: 'Adamaoua',     city: 'Ngaoundéré', lat: 7.33,  lng: 13.58 },
  { region: 'Nord',         city: 'Garoua',     lat: 9.30,  lng: 13.40 },
  { region: 'Extrême-Nord', city: 'Maroua',     lat: 10.60, lng: 14.33 },
  { region: 'Est',          city: 'Bertoua',    lat: 4.58,  lng: 13.68 },
  { region: 'Sud',          city: 'Ebolowa',    lat: 2.90,  lng: 11.15 },
]

function nearestZone(lat: number, lng: number) {
  let best = CAMEROON_ZONES[0]; let bestDist = Infinity
  for (const z of CAMEROON_ZONES) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) { bestDist = d; best = z }
  }
  return best!
}

type Filters = { sector?: string; region?: string; city?: string; query?: string; lat?: string; lng?: string; radius?: string }
type Props   = { initialValues?: Filters; onSubmit: (v: Filters) => void }

// ─── Component ───────────────────────────────────────────────────────────────
export function SearchFiltersForm({ initialValues = {}, onSubmit }: Props) {
  const { t } = useTranslation()
  const [query,  setQuery]  = useState(initialValues.query  ?? '')
  const [sector, setSector] = useState(initialValues.sector ?? '')
  const [region, setRegion] = useState(initialValues.region ?? '')
  const [city,   setCity]   = useState(initialValues.city   ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [geoState, setGeoState]         = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [geoMsg,   setGeoMsg]           = useState('')

  // Cities available for the selected region
  const availableCities = region ? (CITIES_BY_REGION[region] ?? []) : []

  useEffect(() => {
    setQuery(initialValues.query   ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city     ?? '')
  }, [initialValues.query, initialValues.sector, initialValues.region, initialValues.city])

  function handleRegionChange(r: string) {
    setRegion(r)
    setCity('')   // always reset city when region changes
  }

  function submit(overrides: Partial<Filters> = {}) {
    onSubmit({
      query:  (overrides.query  ?? query)  || undefined,
      sector: (overrides.sector ?? sector) || undefined,
      region: (overrides.region ?? region) || undefined,
      city:   (overrides.city   ?? city)   || undefined,
    })
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); submit() }

  function handleReset() {
    setQuery(''); setSector(''); setRegion(''); setCity('')
    setGeoState('idle'); setGeoMsg('')
    onSubmit({})
  }

  function applyQuickSector(value: string) {
    setSector(value)
    onSubmit({ query: query || undefined, sector: value || undefined, region: region || undefined, city: city || undefined })
  }

  function handleLocateMe() {
    if (!navigator.geolocation) { setGeoState('error'); setGeoMsg(t('search.locationNotSupported')); return }
    setGeoState('loading'); setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(z.region); setCity(z.city)
        setGeoState('done'); setGeoMsg(`📍 ${z.city} (${z.region})`)
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
      <style dangerouslySetInnerHTML={{__html: `
        /* ── Search bar block ── */
        .sc-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .sc-filters-container {
            position: sticky;
            top: 60px; /* Exact height of AppHeader */
            z-index: 99;
            background: var(--bg); /* Adapts to light/dark themes */
            padding: 12px 16px;
            margin: 0 -16px 8px;
            width: calc(100% + 32px);
            border-bottom: 1px solid var(--bd);
          }
        }
        .sc-input-wrap {
          flex: 1;
          min-width: 0;
          position: relative;
        }
        .sc-input-wrap svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--cr-secondary-text-color);
        }
        .sc-input {
          width: 100%;
          height: 48px;
          padding: 0 48px 0 44px;
          border: 1.5px solid var(--bd);
          border-radius: 999px;
          background: var(--bg2);
          color: var(--tx);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 180ms ease, box-shadow 180ms ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .sc-input::placeholder {
          color: var(--tx2);
          opacity: 0.7;
        }
        .sc-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0,85,255,0.12);
        }
        .sc-submit-btn {
          width: 46px;
          min-width: 46px;
          height: 46px;
          padding: 0;
          border-radius: 50%;
          background: var(--color-primary);
          color: #fff;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 180ms ease, transform 120ms ease;
        }
        .sc-submit-btn:hover {
          background: var(--color-blue-600);
          transform: translateY(-1px);
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
        }
        .sc-pills-scroll {
          flex: 1;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
          margin-right: 6px;
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
          display: inline-flex; align-items: center; gap: 4px;
          height: 28px; padding: 0 12px;
          border-radius: 999px;
          border: 1.5px solid var(--bd);
          background: var(--bg2);
          color: var(--tx);
          font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: all 150ms ease; white-space: nowrap;
        }
        .sc-pill:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .sc-pill.active {
          border-color: var(--color-primary);
          background: rgba(0,85,255,0.09);
          color: var(--color-primary);
          font-weight: 700;
        }
        .sc-adv-btn:hover { color: var(--color-primary); }
        .sc-adv-chevron { transition: transform 200ms ease; }
        .sc-adv-chevron.open { transform: rotate(180deg); }

          .sc-pills {
            padding: 2px 0;
          }
        }

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
          background: rgba(0,85,255,0.09);
          border: 1px solid rgba(0,85,255,0.3);
          color: var(--color-primary); font-weight: 600;
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
      `}} />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="sc-filters-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* ── Block 1: Search bar ── */}
            <div className="sc-bar">
          <div className="sc-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="main-search-input"
              className="sc-input"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="sc-submit-btn" aria-label="Lancer la recherche">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* ── Block 2: Quick-sector pills + advanced toggle ── */}
        <div className="sc-pills-row">
          <div className="sc-pills-scroll">
            <div className="sc-pills">
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
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

        {/* ── Active filter chips ── */}
        {hasFilters && (
          <div className="sc-chips">
            {query  && <ActiveChip label={`"${query}"`}  onRemove={() => { setQuery('');  submit({ query: undefined }) }} />}
            {region && <ActiveChip label={t(`regions.${REGION_KEYS[region]}` as any)} onRemove={() => { setRegion(''); setCity(''); submit({ region: undefined, city: undefined }) }} />}
            {city   && <ActiveChip label={city}          onRemove={() => { setCity('');   submit({ city: undefined }) }} />}
            {/* Sector chip removed here to avoid redundancy with quick-sector pills */}
            <button type="button" className="sc-reset-btn" onClick={handleReset}>{t('search.clearAll')}</button>
          </div>
        )}
      </form>
    </>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="sc-chip">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Retirer ${label}`}>✕</button>
    </span>
  )
}
