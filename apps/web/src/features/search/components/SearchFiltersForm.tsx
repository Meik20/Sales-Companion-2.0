'use client'

import { FormEvent, useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { colors } from '@/styles/tokens'

const REGIONS = [
  '', 'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
]

const SECTORS = [
  '', 'Commerce', 'BTP & Construction', 'Industrie manufacturière',
  'Agriculture & Agroalimentaire', 'Services & Conseil', 'Transport & Logistique',
  'Hôtellerie & Restauration', 'Santé', 'Éducation & Formation',
  'Technologies & Numérique', 'Finance & Assurance', 'Énergie & Mines',
]

// Mapping GPS coordinates → Cameroon region/city
const CAMEROON_ZONES = [
  { region: 'Littoral',    city: 'Douala',    lat: 4.05,  lng: 9.70  },
  { region: 'Centre',      city: 'Yaoundé',   lat: 3.87,  lng: 11.52 },
  { region: 'Ouest',       city: 'Bafoussam', lat: 5.48,  lng: 10.42 },
  { region: 'Nord-Ouest',  city: 'Bamenda',   lat: 5.96,  lng: 10.16 },
  { region: 'Sud-Ouest',   city: 'Buea',      lat: 4.15,  lng: 9.24  },
  { region: 'Adamaoua',    city: 'Ngaoundéré',lat: 7.33,  lng: 13.58 },
  { region: 'Nord',        city: 'Garoua',    lat: 9.30,  lng: 13.40 },
  { region: 'Extrême-Nord',city: 'Maroua',    lat: 10.60, lng: 14.33 },
  { region: 'Est',         city: 'Bertoua',   lat: 4.58,  lng: 13.68 },
  { region: 'Sud',         city: 'Ebolowa',   lat: 2.90,  lng: 11.15 },
]

function nearestZone(lat: number, lng: number) {
  let best = CAMEROON_ZONES[0]
  let bestDist = Infinity
  for (const z of CAMEROON_ZONES) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) { bestDist = d; best = z }
  }
  // best is always defined since CAMEROON_ZONES is non-empty
  return best!
}

type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  initialValues?: Filters
  onSubmit: (values: Filters) => void
}

const selectStyle = {
  width: '100%',
  background: 'var(--cr-card-background-color)',
  border: '1px solid var(--cr-separator-color)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--cr-primary-text-color)',
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
}

export function SearchFiltersForm({ initialValues = {}, onSubmit }: Props) {
  const [query,  setQuery]  = useState(initialValues.query  ?? '')
  const [sector, setSector] = useState(initialValues.sector ?? '')
  const [region, setRegion] = useState(initialValues.region ?? '')
  const [city,   setCity]   = useState(initialValues.city   ?? '')
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [geoMsg, setGeoMsg] = useState('')

  useEffect(() => {
    setQuery(initialValues.query   ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city     ?? '')
  }, [initialValues.query, initialValues.sector, initialValues.region, initialValues.city])

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
    setGeoState('idle'); setGeoMsg('')
    onSubmit({})
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setGeoState('error')
      setGeoMsg('Géolocalisation non supportée par votre navigateur.')
      return
    }
    setGeoState('loading')
    setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const zone = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(zone.region)
        setCity(zone.city)
        setGeoState('done')
        setGeoMsg(`📍 Détecté : ${zone.city} (${zone.region})`)
        // Auto-submit with the detected location
        onSubmit({
          query:  query  || undefined,
          sector: sector || undefined,
          region: zone.region,
          city:   zone.city,
        })
      },
      (err) => {
        setGeoState('error')
        setGeoMsg(
          err.code === 1
            ? 'Accès à la position refusé. Autorisez la localisation dans votre navigateur.'
            : 'Impossible de détecter votre position. Vérifiez votre GPS.'
        )
      },
      { timeout: 8000, maximumAge: 60000 }
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Bouton "Autour de moi" — mis en valeur en haut */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={geoState === 'loading'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '11px 16px',
          background: geoState === 'done'
            ? 'var(--google-green-50)'
            : 'linear-gradient(135deg, var(--google-green-800), var(--google-green-900))',
          color: geoState === 'done' ? 'var(--google-green-800)' : '#fff',
          border: geoState === 'done' ? '1.5px solid var(--google-green-800)' : 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: geoState === 'loading' ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 200ms ease',
          opacity: geoState === 'loading' ? 0.7 : 1,
        }}
      >
        <span style={{ fontSize: 16 }}>
          {geoState === 'loading' ? '⏳' : geoState === 'done' ? '✅' : '📍'}
        </span>
        {geoState === 'loading'
          ? 'Détection en cours…'
          : geoState === 'done'
          ? 'Position détectée'
          : 'Prospects autour de moi'}
      </button>

      {/* Message géolocalisation */}
      {geoMsg && (
        <div style={{
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          background: geoState === 'error' ? 'rgba(234,67,53,0.08)' : 'var(--google-green-50)',
          color: geoState === 'error' ? 'var(--google-red-600,#c62828)' : 'var(--google-green-800)',
          border: `1px solid ${geoState === 'error' ? 'rgba(234,67,53,0.2)' : 'rgba(19,115,51,0.2)'}`,
        }}>
          {geoMsg}
        </div>
      )}

      {/* Recherche libre */}
      <FormField label="Recherche libre">
        <Input
          id="main-search-input"
          placeholder="Nom d'entreprise, dirigeant, NIU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <FormField label="Secteur">
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={selectStyle}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s || 'Tous les secteurs'}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Région">
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={selectStyle}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r || 'Toutes les régions'}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Ville">
          <Input
            placeholder="Yaoundé, Douala…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button type="submit" variant="primary" size="md">
          🔍 Rechercher
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={handleReset}>
          Réinitialiser
        </Button>
      </div>
    </form>
  )
}
