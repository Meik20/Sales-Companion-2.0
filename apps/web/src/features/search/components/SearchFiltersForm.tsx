'use client'

import { FormEvent, useState, useEffect } from 'react'
import { colors } from '@/styles/tokens'

// ─── Data ────────────────────────────────────────────────────────────────────
const REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
]

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

// Quick-filter pills shown beneath the search bar
const QUICK_SECTORS = [
  { label: 'Tous', value: '' },
  { label: 'BTP', value: 'BTP & Construction', icon: '🏗' },
  { label: 'Commerce', value: 'Commerce', icon: '🛒' },
  { label: 'Tech', value: 'Technologies & Numérique', icon: '💻' },
  { label: 'Agro', value: 'Agriculture & Agroalimentaire', icon: '🌾' },
  { label: 'Transport', value: 'Transport & Logistique', icon: '🚛' },
  { label: 'Santé', value: 'Santé', icon: '⚕️' },
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
  let best = CAMEROON_ZONES[0]
  let bestDist = Infinity
  for (const z of CAMEROON_ZONES) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) { bestDist = d; best = z }
  }
  return best!
}

type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  initialValues?: Filters
  onSubmit: (values: Filters) => void
}

// ─── Component ───────────────────────────────────────────────────────────────
export function SearchFiltersForm({ initialValues = {}, onSubmit }: Props) {
  const [query,  setQuery]  = useState(initialValues.query  ?? '')
  const [sector, setSector] = useState(initialValues.sector ?? '')
  const [region, setRegion] = useState(initialValues.region ?? '')
  const [city,   setCity]   = useState(initialValues.city   ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [geoState, setGeoState]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [showGeoMsg, setShowGeoMsg] = useState('')

  const availableCities = region ? (CITIES_BY_REGION[region] ?? []) : []
  const hasActiveFilters = !!(query || sector || region || city)

  useEffect(() => {
    setQuery(initialValues.query   ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city     ?? '')
  }, [initialValues.query, initialValues.sector, initialValues.region, initialValues.city])

  function handleRegionChange(newRegion: string) {
    setRegion(newRegion)
    setCity('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      query:  query  || undefined,
      sector: sector || undefined,
      region: region || undefined,
      city:   city   || undefined,
    })
  }

  function handleReset() {
    setQuery(''); setSector(''); setRegion(''); setCity('')
    setGeoState('idle'); setShowGeoMsg('')
    onSubmit({})
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setGeoState('error')
      setShowGeoMsg('Géolocalisation non supportée par votre navigateur.')
      return
    }
    setGeoState('loading')
    setShowGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const zone = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(zone.region)
        setCity(zone.city)
        setGeoState('done')
        setShowGeoMsg(`📍 ${zone.city} (${zone.region})`)
        onSubmit({ query: query || undefined, sector: sector || undefined, region: zone.region, city: zone.city })
      },
      (err) => {
        setGeoState('error')
        setShowGeoMsg(
          err.code === 1
            ? 'Localisation refusée. Autorisez-la dans votre navigateur.'
            : 'Position indisponible. Vérifiez votre GPS.'
        )
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }

  function applyQuickSector(value: string) {
    setSector(value)
    onSubmit({ query: query || undefined, sector: value || undefined, region: region || undefined, city: city || undefined })
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .sc-search-wrapper { display: flex; flex-direction: column; gap: 10px; }

        /* ── Main row ── */
        .sc-search-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sc-search-input-wrap {
          flex: 1;
          position: relative;
        }
        .sc-search-input-wrap svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--cr-secondary-text-color);
        }
        .sc-search-input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 40px;
          border: 1.5px solid var(--cr-separator-color);
          border-radius: 12px;
          background: var(--cr-card-background-color);
          color: var(--cr-primary-text-color);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }
        .sc-search-input::placeholder { color: var(--cr-secondary-text-color); }
        .sc-search-input:focus {
          border-color: var(--google-green-500);
          box-shadow: 0 0 0 3px rgba(52,168,83,0.12);
        }
        .sc-search-btn {
          height: 44px;
          padding: 0 22px;
          border-radius: 12px;
          background: var(--google-green-600);
          color: #fff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
          transition: background 180ms ease, box-shadow 180ms ease;
          flex-shrink: 0;
        }
        .sc-search-btn:hover {
          background: var(--google-green-700);
          box-shadow: 0 4px 14px rgba(30,142,62,0.3);
        }

        /* ── Quick-sector pills ── */
        .sc-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sc-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 30px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1.5px solid var(--cr-separator-color);
          background: var(--cr-card-background-color);
          color: var(--cr-primary-text-color);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
          font-family: inherit;
          white-space: nowrap;
        }
        .sc-pill:hover {
          border-color: var(--google-green-500);
          color: var(--google-green-700);
          background: rgba(52,168,83,0.06);
        }
        .sc-pill.active {
          border-color: var(--google-green-500);
          background: rgba(52,168,83,0.1);
          color: var(--google-green-700);
          font-weight: 700;
        }

        /* ── Advanced filters toggle ── */
        .sc-advanced-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: var(--google-green-600);
          font-family: inherit;
          padding: 2px 0;
          transition: color 150ms ease;
        }
        .sc-advanced-toggle:hover { color: var(--google-green-700); }

        /* ── Advanced panel ── */
        .sc-advanced-panel {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: end;
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--md-background-color);
          border: 1px solid var(--cr-separator-color);
          animation: sc-slide-down 180ms ease;
        }
        @keyframes sc-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sc-select {
          height: 38px;
          background: var(--cr-card-background-color);
          border: 1.5px solid var(--cr-separator-color);
          border-radius: 9px;
          padding: 0 10px;
          font-size: 13px;
          color: var(--cr-primary-text-color);
          font-family: inherit;
          outline: none;
          cursor: pointer;
          width: 100%;
          transition: border-color 150ms ease;
        }
        .sc-select:focus { border-color: var(--google-green-500); }
        .sc-geo-btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          background: rgba(52,168,83,0.08);
          border: 1.5px solid rgba(52,168,83,0.25);
          color: var(--google-green-600);
          flex-shrink: 0;
        }
        .sc-geo-btn:hover { background: rgba(52,168,83,0.14); }
        .sc-geo-btn.done { background: rgba(52,168,83,0.14); border-color: rgba(52,168,83,0.5); }

        /* ── Active filter chips ── */
        .sc-active-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .sc-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(52,168,83,0.1);
          border: 1px solid rgba(52,168,83,0.3);
          color: var(--google-green-700);
          font-weight: 600;
        }
        .sc-chip button {
          background: none; border: none; cursor: pointer;
          padding: 0; color: inherit; font-size: 12px; line-height: 1;
          display: flex; align-items: center;
        }

        /* ── Reset button ── */
        .sc-reset-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 28px; padding: 0 10px; border-radius: 8px;
          background: transparent; border: 1px solid var(--cr-separator-color);
          color: var(--cr-secondary-text-color); font-size: 11.5px;
          font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 150ms ease;
        }
        .sc-reset-btn:hover { background: rgba(0,0,0,0.04); }

        @media (max-width: 640px) {
          .sc-search-row { flex-wrap: wrap; }
          .sc-search-btn { width: 100%; justify-content: center; }
          .sc-advanced-panel { grid-template-columns: 1fr; }
          .sc-geo-btn { width: 100%; justify-content: center; }
        }
      `}} />

      <form onSubmit={handleSubmit} className="sc-search-wrapper">

        {/* ── Row 1: Search input + Submit ── */}
        <div className="sc-search-row">
          <div className="sc-search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="main-search-input"
              className="sc-search-input"
              placeholder="Entreprise, secteur, ville…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="sc-search-btn">Chercher</button>
        </div>

        {/* ── Row 2: Quick pills + Advanced toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div className="sc-pills">
            {QUICK_SECTORS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`sc-pill${sector === s.value ? ' active' : ''}`}
                onClick={() => applyQuickSector(s.value)}
              >
                {s.icon && <span>{s.icon}</span>}
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sc-advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
            </svg>
            Filtres avancés
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAdvanced ? 'rotate(180deg)' : undefined, transition: '200ms' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {/* ── Row 3: Advanced panel (Region, City, Sector full, Geo) ── */}
        {showAdvanced && (
          <div className="sc-advanced-panel">
            {/* Région */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cr-secondary-text-color)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Région</label>
              <select className="sc-select" value={region} onChange={(e) => handleRegionChange(e.target.value)} aria-label="Région">
                <option value="">📍 Toutes les régions</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Ville */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cr-secondary-text-color)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Ville</label>
              <select className="sc-select" value={city} onChange={(e) => setCity(e.target.value)} disabled={!region} aria-label="Ville">
                <option value="">🏙 {region ? 'Toutes les villes' : 'Choisissez une région'}</option>
                {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Geo button aligned at bottom */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={geoState === 'loading'}
              className={`sc-geo-btn${geoState === 'done' ? ' done' : ''}`}
              title="Détecter ma position"
              style={{ alignSelf: 'flex-end' }}
            >
              {geoState === 'loading' ? '⏳' : geoState === 'done' ? '✅' : '📍'}
              Autour de moi
            </button>

            {/* Secteur complet — full-width below */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cr-secondary-text-color)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Secteur d&apos;activité</label>
              <select className="sc-select" value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Secteur">
                <option value="">🏢 Tous les secteurs</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Geo feedback message ── */}
        {showGeoMsg && (
          <div style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: geoState === 'error' ? 'rgba(234,67,53,0.08)' : 'rgba(52,168,83,0.08)',
            color: geoState === 'error' ? '#c62828' : 'var(--google-green-700)',
            border: `1px solid ${geoState === 'error' ? 'rgba(234,67,53,0.25)' : 'rgba(52,168,83,0.25)'}`,
          }}>
            {showGeoMsg}
          </div>
        )}

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="sc-active-chips">
              {query  && <ActiveChip label={`"${query}"`}  onRemove={() => { setQuery('');  onSubmit({ sector: sector || undefined, region: region || undefined, city: city || undefined }) }} />}
              {region && <ActiveChip label={region}        onRemove={() => { setRegion(''); setCity(''); onSubmit({ query: query || undefined, sector: sector || undefined }) }} />}
              {city   && <ActiveChip label={city}          onRemove={() => { setCity('');   onSubmit({ query: query || undefined, sector: sector || undefined, region: region || undefined }) }} />}
              {sector && <ActiveChip label={sector}        onRemove={() => { setSector(''); applyQuickSector('') }} />}
            </div>
            <button type="button" className="sc-reset-btn" onClick={handleReset}>✕ Tout effacer</button>
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
