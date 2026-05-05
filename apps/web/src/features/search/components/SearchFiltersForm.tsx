'use client'

import { FormEvent, useState, useEffect } from 'react'

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

const QUICK_SECTORS = [
  { label: 'Tous',      value: '' },
  { label: 'BTP',       value: 'BTP & Construction',         icon: '🏗' },
  { label: 'Commerce',  value: 'Commerce',                   icon: '🛒' },
  { label: 'Tech',      value: 'Technologies & Numérique',   icon: '💻' },
  { label: 'Agro',      value: 'Agriculture & Agroalimentaire', icon: '🌾' },
  { label: 'Transport', value: 'Transport & Logistique',     icon: '🚛' },
  { label: 'Santé',     value: 'Santé',                      icon: '⚕️' },
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

type Filters = { sector?: string; region?: string; city?: string; query?: string }
type Props   = { initialValues?: Filters; onSubmit: (v: Filters) => void }

// ─── Component ───────────────────────────────────────────────────────────────
export function SearchFiltersForm({ initialValues = {}, onSubmit }: Props) {
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
    if (!navigator.geolocation) { setGeoState('error'); setGeoMsg('Géolocalisation non supportée.'); return }
    setGeoState('loading'); setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(z.region); setCity(z.city)
        setGeoState('done'); setGeoMsg(`📍 ${z.city} (${z.region})`)
        onSubmit({ query: query || undefined, sector: sector || undefined, region: z.region, city: z.city })
      },
      (err) => {
        setGeoState('error')
        setGeoMsg(err.code === 1 ? 'Localisation refusée. Autorisez-la dans votre navigateur.' : 'Position indisponible.')
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
          border: 1.5px solid var(--cr-separator-color);
          border-radius: 999px;
          background: var(--cr-card-background-color);
          color: var(--cr-primary-text-color);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 180ms ease, box-shadow 180ms ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .sc-input::placeholder {
          color: var(--cr-secondary-text-color);
          opacity: 0.7;
        }
        .sc-input:focus {
          border-color: var(--google-green-500, #34a853);
          box-shadow: 0 0 0 3px rgba(52,168,83,0.12);
        }
        .sc-submit-btn {
          width: 46px;
          min-width: 46px;
          height: 46px;
          padding: 0;
          border-radius: 50%;
          background: var(--google-green-600, #1e8e3e);
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
          background: var(--google-green-700, #137333);
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
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sc-pills-scroll {
          flex: 1;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
          margin-right: 6px;
        }
        .sc-pills-scroll::-webkit-scrollbar { display: none; }
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
          border: 1.5px solid var(--cr-separator-color);
          background: var(--cr-card-background-color);
          color: var(--cr-primary-text-color);
          font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: all 150ms ease; white-space: nowrap;
        }
        .sc-pill:hover { border-color: var(--google-green-500,#34a853); color: var(--google-green-700,#137333); }
        .sc-pill.active {
          border-color: var(--google-green-500,#34a853);
          background: rgba(52,168,83,0.09);
          color: var(--google-green-700,#137333);
          font-weight: 700;
        }
        .sc-adv-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer;
          font-size: 12.5px; font-weight: 600;
          color: var(--google-green-600,#1e8e3e);
          font-family: inherit; padding: 2px 0;
          white-space: nowrap;
          transition: color 150ms ease;
        }
        .sc-adv-btn:hover { color: var(--google-green-700,#137333); }
        .sc-adv-chevron { transition: transform 200ms ease; }
        .sc-adv-chevron.open { transform: rotate(180deg); }

        /* ── Advanced panel ── */
        .sc-adv-panel {
          display: flex; flex-direction: column; gap: 10px;
          padding: 14px 16px;
          border-radius: 10px;
          background: var(--cr-card-background-color);
          border: 1.5px solid var(--cr-separator-color);
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
          color: var(--cr-secondary-text-color);
          text-transform: uppercase; letter-spacing: .05em;
          margin-bottom: 4px;
        }
        .sc-adv-select {
          width: 100%; height: 36px; padding: 0 10px;
          border: 1.5px solid var(--cr-separator-color);
          border-radius: 8px;
          background: var(--md-background-color, var(--cr-card-background-color));
          color: var(--cr-primary-text-color);
          font-size: 12.5px; font-family: inherit;
          outline: none; cursor: pointer;
          transition: border-color 150ms ease;
        }
        .sc-adv-select:focus { border-color: var(--google-green-500,#34a853); }
        .sc-adv-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .sc-geo-btn {
          height: 36px; padding: 0 14px;
          border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          background: rgba(52,168,83,0.07);
          border: 1.5px solid rgba(52,168,83,0.25);
          color: var(--google-green-600,#1e8e3e);
          display: flex; align-items: center; justify-content: center; gap: 5px;
          transition: all 150ms ease; white-space: nowrap; width: 100%;
        }
        .sc-geo-btn:hover { background: rgba(52,168,83,0.13); }
        .sc-geo-btn.done { background: rgba(52,168,83,0.13); border-color: rgba(52,168,83,0.5); }
        .sc-geo-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Active chips ── */
        .sc-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .sc-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; padding: 3px 10px; border-radius: 999px;
          background: rgba(52,168,83,0.09);
          border: 1px solid rgba(52,168,83,0.3);
          color: var(--google-green-700,#137333); font-weight: 600;
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
          border: 1px solid var(--cr-separator-color);
          color: var(--cr-secondary-text-color);
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
          .sc-pills-row { display: none; }
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

        {/* ── Block 1: Search bar ── */}
        <div className="sc-bar">
          <div className="sc-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="main-search-input"
              className="sc-input"
              placeholder="Entreprise, secteur, ville…"
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
              {QUICK_SECTORS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`sc-pill${sector === s.value ? ' active' : ''}`}
                  onClick={() => applyQuickSector(s.value)}
                >
                  {s.icon && <span style={{ fontSize: 12 }}>{s.icon}</span>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="sc-adv-btn"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
              </svg>
              Filtres avancés
              <svg className={`sc-adv-chevron${showAdvanced ? ' open' : ''}`} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </button>
        </div>

        {/* ── Block 3: Advanced panel (separate card, conditionally rendered) ── */}
        {showAdvanced && (
          <div className="sc-adv-panel">
            <div className="sc-adv-row" style={{ gridTemplateColumns: region ? '1fr 1fr 1fr' : '1fr 1fr' }}>

              {/* Région */}
              <div className="sc-adv-field">
                <label>📍 Région</label>
                <select
                  className="sc-adv-select"
                  value={region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  aria-label="Région"
                >
                  <option value="">Toutes les régions</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Ville — appears only when a region is selected */}
              {region && availableCities.length > 0 && (
                <div className="sc-adv-field sc-city-field">
                  <label>🏙 Ville</label>
                  <select
                    className="sc-adv-select"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-label="Ville"
                  >
                    <option value="">Toutes les villes</option>
                    {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* Autour de moi */}
              <div className="sc-adv-field sc-adv-geo-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <label>📡 Géolocalisation</label>
                <button
                  type="button"
                  className={`sc-geo-btn${geoState === 'done' ? ' done' : ''}`}
                  onClick={handleLocateMe}
                  disabled={geoState === 'loading'}
                >
                  {geoState === 'loading' ? '⏳ Détection…' : geoState === 'done' ? '✅ Autour de moi' : '📍 Autour de moi'}
                </button>
              </div>

              {/* Secteur complet — full width */}
              <div className="sc-adv-field" style={{ gridColumn: '1 / -1' }}>
                <label>🏢 Secteur d&apos;activité</label>
                <select
                  className="sc-adv-select"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  aria-label="Secteur"
                >
                  <option value="">Tous les secteurs</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Geo feedback */}
            {geoMsg && (
              <div
                className="sc-geo-msg"
                style={{
                  background: geoState === 'error' ? 'rgba(234,67,53,0.08)' : 'rgba(52,168,83,0.08)',
                  color:      geoState === 'error' ? '#c62828' : 'var(--google-green-700,#137333)',
                  border: `1px solid ${geoState === 'error' ? 'rgba(234,67,53,0.25)' : 'rgba(52,168,83,0.25)'}`,
                }}
              >
                {geoMsg}
              </div>
            )}

            {/* Apply / Cancel */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sc-reset-btn" onClick={handleReset}>✕ Réinitialiser</button>
              <button
                type="submit"
                style={{
                  height: 34, padding: '0 18px', borderRadius: 8,
                  background: 'var(--google-green-600,#1e8e3e)', color: '#fff',
                  border: 'none', fontSize: 12.5, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Appliquer
              </button>
            </div>
          </div>
        )}

        {/* ── Active filter chips ── */}
        {hasFilters && (
          <div className="sc-chips">
            {query  && <ActiveChip label={`"${query}"`}  onRemove={() => { setQuery('');  submit({ query: undefined }) }} />}
            {region && <ActiveChip label={region}        onRemove={() => { setRegion(''); setCity(''); submit({ region: undefined, city: undefined }) }} />}
            {city   && <ActiveChip label={city}          onRemove={() => { setCity('');   submit({ city: undefined }) }} />}
            {sector && <ActiveChip label={sector}        onRemove={() => { setSector(''); applyQuickSector('') }} />}
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
