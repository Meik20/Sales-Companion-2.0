'use client'

import { FormEvent, useState, useEffect } from 'react'
import { colors } from '@/styles/tokens'

// ─── Données géographiques ─────────────────────────────────────────────────
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

// GPS → détection automatique de la zone
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

// ─── Types ──────────────────────────────────────────────────────────────────
type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  initialValues?: Filters
  onSubmit: (values: Filters) => void
}

// ─── Styles partagés ────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  height: 40,
  background: 'var(--cr-card-background-color)',
  border: '1px solid var(--cr-separator-color)',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 13,
  color: 'var(--cr-primary-text-color)',
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  width: '100%',
}

// ─── Composant ──────────────────────────────────────────────────────────────
export function SearchFiltersForm({ initialValues = {}, onSubmit }: Props) {
  const [query,  setQuery]  = useState(initialValues.query  ?? '')
  const [sector, setSector] = useState(initialValues.sector ?? '')
  const [region, setRegion] = useState(initialValues.region ?? '')
  const [city,   setCity]   = useState(initialValues.city   ?? '')
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [showGeoMsg, setShowGeoMsg] = useState('')

  // Villes disponibles pour la région sélectionnée
  const availableCities = region ? (CITIES_BY_REGION[region] ?? []) : []

  // Sync avec les valeurs initiales (ex: restauration depuis URL)
  useEffect(() => {
    setQuery(initialValues.query   ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city     ?? '')
  }, [initialValues.query, initialValues.sector, initialValues.region, initialValues.city])

  // Réinitialiser la ville si la région change
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
        onSubmit({
          query:  query  || undefined,
          sector: sector || undefined,
          region: zone.region,
          city:   zone.city,
        })
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

  const hasActiveFilters = !!(query || sector || region || city)

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .search-bar-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .search-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .search-input-wrap {
          flex: 2;
          min-width: 180px;
          position: relative;
        }
        .search-input-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          opacity: 0.45;
        }
        .search-input-main {
          width: 100%;
          height: 40px;
          padding: 0 12px 0 36px;
          border: 1px solid var(--cr-separator-color);
          border-radius: 10px;
          background: var(--cr-card-background-color);
          color: var(--cr-primary-text-color);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 200ms ease;
        }
        .search-input-main:focus {
          border-color: var(--google-green-700, #2e7d32);
          box-shadow: 0 0 0 3px rgba(46,160,90,0.12);
        }
        .filter-select-wrap {
          flex: 1;
          min-width: 130px;
          position: relative;
        }
        .filter-select-wrap::after {
          content: '';
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid var(--cr-secondary-text-color, #888);
          pointer-events: none;
        }
        .search-btn-primary {
          height: 40px;
          padding: 0 18px;
          background: linear-gradient(135deg, #1b7a3e, #137333);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .search-btn-primary:hover {
          background: linear-gradient(135deg, #137333, #0d5c2a);
          box-shadow: 0 4px 14px rgba(27,122,62,0.35);
        }
        .search-btn-geo {
          height: 40px;
          padding: 0 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .search-btn-reset {
          height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          background: transparent;
          border: 1px solid var(--cr-separator-color);
          color: var(--cr-secondary-text-color);
          transition: all 200ms ease;
          flex-shrink: 0;
        }
        .search-btn-reset:hover {
          background: rgba(0,0,0,0.05);
        }
        .geo-badge {
          font-size: 11.5px;
          padding: 5px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        @media (max-width: 640px) {
          .search-bar-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-select-wrap, .search-input-wrap {
            min-width: unset;
            flex: unset;
            width: 100%;
          }
          .search-btn-primary, .search-btn-geo, .search-btn-reset {
            width: 100%;
            justify-content: center;
          }
        }
      `}} />

      <form onSubmit={handleSubmit} className="search-bar-wrapper">
        {/* Ligne principale */}
        <div className="search-bar-row">
          {/* Champ texte libre */}
          <div className="search-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="main-search-input"
              className="search-input-main"
              placeholder="Nom d'entreprise, dirigeant, NIU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Région */}
          <div className="filter-select-wrap" style={{ minWidth: 140 }}>
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              style={selectStyle}
              aria-label="Région"
            >
              <option value="">📍 Région</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Ville — apparaît seulement si une région est sélectionnée */}
          {region && availableCities.length > 0 && (
            <div className="filter-select-wrap" style={{ minWidth: 130 }}>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={selectStyle}
                aria-label="Ville"
              >
                <option value="">🏙 Ville</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Secteur */}
          <div className="filter-select-wrap" style={{ minWidth: 160 }}>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              style={selectStyle}
              aria-label="Secteur"
            >
              <option value="">🏢 Secteur</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Bouton Rechercher */}
          <button type="submit" className="search-btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Rechercher
          </button>

          {/* Bouton Géolocalisation */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={geoState === 'loading'}
            className="search-btn-geo"
            title="Détecter ma position"
            style={{
              background: geoState === 'done'
                ? 'rgba(27,122,62,0.12)'
                : 'rgba(27,122,62,0.08)',
              border: `1px solid ${geoState === 'done' ? 'rgba(46,160,90,0.5)' : 'rgba(46,160,90,0.25)'}`,
              color: colors.green,
              opacity: geoState === 'loading' ? 0.65 : 1,
            }}
          >
            {geoState === 'loading' ? '⏳' : geoState === 'done' ? '✅' : '📍'}
            <span className="search-geo-label">
              {geoState === 'loading' ? 'Détection…' : 'Autour de moi'}
            </span>
          </button>

          {/* Réinitialiser — visible seulement si filtres actifs */}
          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="search-btn-reset" title="Réinitialiser">
              ✕
            </button>
          )}
        </div>

        {/* Message géolocalisation */}
        {showGeoMsg && (
          <div
            className="geo-badge"
            style={{
              background: geoState === 'error' ? 'rgba(234,67,53,0.08)' : 'rgba(27,122,62,0.08)',
              color: geoState === 'error' ? '#c62828' : colors.green,
              border: `1px solid ${geoState === 'error' ? 'rgba(234,67,53,0.25)' : 'rgba(46,160,90,0.25)'}`,
            }}
          >
            {showGeoMsg}
          </div>
        )}

        {/* Filtres actifs — chips résumé */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {query  && <ActiveChip label={`"${query}"`}  onRemove={() => { setQuery('');  onSubmit({ sector: sector || undefined, region: region || undefined, city: city || undefined }) }} />}
            {region && <ActiveChip label={region}        onRemove={() => { setRegion(''); setCity(''); onSubmit({ query: query || undefined, sector: sector || undefined }) }} />}
            {city   && <ActiveChip label={city}          onRemove={() => { setCity('');   onSubmit({ query: query || undefined, sector: sector || undefined, region: region || undefined }) }} />}
            {sector && <ActiveChip label={sector}        onRemove={() => { setSector(''); onSubmit({ query: query || undefined, region: region || undefined, city: city || undefined }) }} />}
          </div>
        )}
      </form>
    </>
  )
}

// ─── Chip de filtre actif ────────────────────────────────────────────────────
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11.5,
      padding: '3px 9px',
      borderRadius: 999,
      background: 'rgba(27,122,62,0.1)',
      border: '1px solid rgba(46,160,90,0.3)',
      color: colors.green,
      fontWeight: 600,
    }}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, color: 'inherit', fontSize: 12, lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}
        aria-label={`Retirer le filtre ${label}`}
      >✕</button>
    </span>
  )
}
