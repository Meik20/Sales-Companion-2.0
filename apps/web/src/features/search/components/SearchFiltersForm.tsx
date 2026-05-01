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

type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  initialValues?: Filters
  onSubmit: (values: Filters) => void
}

const selectStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  color: '#F0F6FC',
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

  useEffect(() => {
    setQuery(initialValues.query  ?? '')
    setSector(initialValues.sector ?? '')
    setRegion(initialValues.region ?? '')
    setCity(initialValues.city   ?? '')
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
    setQuery('')
    setSector('')
    setRegion('')
    setCity('')
    onSubmit({})
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Recherche libre */}
      <FormField label="Recherche libre">
        <Input
          id="main-search-input"
          placeholder="Nom d'entreprise, dirigeant, NIU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <FormField label="Secteur">
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={selectStyle}>
            {SECTORS.map((s) => (
              <option key={s} value={s} style={{ background: '#161B22', color: '#F0F6FC' }}>
                {s || 'Tous les secteurs'}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Région">
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={selectStyle}>
            {REGIONS.map((r) => (
              <option key={r} value={r} style={{ background: '#161B22', color: '#F0F6FC' }}>
                {r || 'Toutes les régions'}
              </option>
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

      <div style={{ display: 'flex', gap: 10 }}>
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
