'use client'

import { useMemo, useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getErrorMessage } from '@/lib/errors'
import { useCreatePipelineItem } from '../hooks/useCreatePipelineItem'
import { useTranslation } from '@/providers/I18nProvider'
import { FileText } from 'lucide-react'
import { getGeography } from '@sales-companion/shared'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'

type Props = {
  onSuccess?: () => void
}

export function CreatePipelineItemForm({ onSuccess }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { code: countryCode, examplePhone, currency } = useProspectingCountryDetails()

  const geography = useMemo(() => getGeography(countryCode), [countryCode])
  const STATUS_OPTIONS = [
    { value: 'prospection', label: t('pipeline.prospection') },
    { value: 'negociation', label: t('pipeline.negotiation') },
    { value: 'conclue', label: t('pipeline.closed') }
  ]
  const mutation = useCreatePipelineItem()

  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyRegion, setCompanyRegion] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyQuarter, setCompanyQuarter] = useState('')
  const [companySector, setCompanySector] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [status, setStatus] = useState<'prospection' | 'negociation' | 'conclue'>('prospection')
  const [error, setError] = useState<string | null>(null)

  // Villes dynamiques selon la région sélectionnée ou toute la liste
  const availableCities = useMemo(() => {
    if (companyRegion && geography?.citiesByRegion?.[companyRegion]) {
      return geography.citiesByRegion[companyRegion]
    }
    const set = new Set<string>()
    if (geography?.citiesByRegion) {
      Object.values(geography.citiesByRegion).forEach((cities) => {
        cities.forEach((c) => set.add(c))
      })
    }
    return Array.from(set).sort()
  }, [geography, companyRegion])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      setError(t('auth.accessImpossible'))
      return
    }
    if (!companyName.trim()) {
      setError(t('pipeline.errorNameRequired'))
      return
    }

    setError(null)
    try {
      const parsedAmount = amount.trim() ? parseFloat(amount.replace(/\s+/g, '')) : undefined

      await mutation.mutateAsync({
        userId: user.uid,
        managerUid: user.role === 'member' ? (user.managerUid ?? null) : user.uid,
        // Passer l'identité de l'assigné pour qu'il soit affiché correctement
        assignedTo: user.uid,
        memberName: user.name || user.email,
        memberAccessId: user.accessId ?? null,
        companyId: null,
        companyName: companyName.trim(),
        companyPhone: companyPhone.trim() || undefined,
        companyEmail: companyEmail.trim() || undefined,
        companyRegion: companyRegion.trim() || undefined,
        companyCity: companyCity.trim() || undefined,
        companyQuarter: companyQuarter.trim() || undefined,
        companySector: companySector.trim() || undefined,
        status,
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : undefined,
        currency: currency || 'FCFA',
        note: note.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextDate: null,
        createdAt: null,
        updatedAt: null
      })
      setCompanyName('')
      setCompanyPhone('')
      setCompanyEmail('')
      setCompanyRegion('')
      setCompanyCity('')
      setCompanyQuarter('')
      setCompanySector('')
      setAmount('')
      setNote('')
      setNextAction('')
      setStatus('prospection')
      onSuccess?.()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* ── 1. ENTREPRISE & COORDONNÉES ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}
      >
        <FormField label={t('pipeline.company')} required>
          <Input
            placeholder={t('pipeline.placeholderCompanyName')}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </FormField>

        <FormField label={t('pipeline.phone') || 'Téléphone'}>
          <Input
            type="tel"
            placeholder={examplePhone ? `Ex: ${examplePhone}` : (t('pipeline.placeholderPhone') || 'Ex: 699 00 00 00')}
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
          />
        </FormField>

        <FormField label={t('pipeline.email') || 'Email'}>
          <Input
            type="email"
            placeholder={t('pipeline.placeholderEmail') || 'contact@entreprise.com'}
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
          />
        </FormField>
      </div>

      {/* ── 2. LOCALISATION & SECTEUR D'ACTIVITÉ ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}
      >
        <FormField label={t('pipeline.region') || 'Région'}>
          <Input
            list="pipeline-regions-datalist"
            placeholder={t('pipeline.placeholderRegion') || 'Littoral, Centre…'}
            value={companyRegion}
            onChange={(e) => setCompanyRegion(e.target.value)}
          />
          <datalist id="pipeline-regions-datalist">
            {geography?.regions?.map((reg) => (
              <option key={reg} value={reg} />
            ))}
          </datalist>
        </FormField>

        <FormField label={t('pipeline.city') || 'Ville'}>
          <Input
            list="pipeline-cities-datalist"
            placeholder={t('pipeline.placeholderCity') || 'Douala, Yaoundé…'}
            value={companyCity}
            onChange={(e) => setCompanyCity(e.target.value)}
          />
          <datalist id="pipeline-cities-datalist">
            {availableCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>

        <FormField label={t('pipeline.quarter') || 'Quartier'}>
          <Input
            placeholder={t('pipeline.placeholderQuarter') || 'Akwa, Bonanjo, Bastos…'}
            value={companyQuarter}
            onChange={(e) => setCompanyQuarter(e.target.value)}
          />
        </FormField>

        <FormField label={t('pipeline.sector') || 'Secteur'}>
          <Input
            placeholder={t('pipeline.placeholderSector') || 'BTP, Commerce…'}
            value={companySector}
            onChange={(e) => setCompanySector(e.target.value)}
          />
        </FormField>
      </div>

      {/* ── 3. STATUT, ACTION & MONTANT ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}
      >
        <FormField label={t('pipeline.status')}>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value as typeof status)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${status === opt.value ? 'rgba(37,99,235,0.5)' : 'var(--border, rgba(255,255,255,0.1))'}`,
                  background: status === opt.value ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: status === opt.value ? '#2563eb' : 'var(--muted-foreground, #94a3b8)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 200ms ease'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label={t('pipeline.nextAction')}>
          <Input
            placeholder={t('pipeline.placeholderNextAction')}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
          />
        </FormField>

        <FormField label={`Montant estimé (${currency || 'FCFA'})`}>
          <Input
            type="number"
            placeholder="Ex: 500000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
      </div>

      {/* ── 4. NOTES COMMERCIALES — champ dédié, pleine largeur ── */}
      <div
        style={{
          background: 'rgba(251,191,36,0.05)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 12,
          padding: '14px 16px'
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            color: '#fbbf24',
            marginBottom: 8
          }}
        >
          <FileText size={13} style={{ flexShrink: 0 }} />
          {t('pipeline.notesLabel')}
          <span
            style={{
              fontWeight: 400,
              color: 'rgba(251,191,36,0.6)',
              textTransform: 'none',
              letterSpacing: 0
            }}
          >
            — {t('pipeline.notesHint')}
          </span>
        </label>
        <textarea
          placeholder={t('pipeline.placeholderNotes')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'transparent',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 13,
            color: 'var(--foreground, #f1f5f9)',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            transition: 'border-color 200ms ease',
            minHeight: 90
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)'
          }}
        />
      </div>

      {error ? <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p> : null}

      <div>
        <Button type="submit" variant="primary" size="md" loading={mutation.isPending}>
          {t('pipeline.addBtn')}
        </Button>
      </div>
    </form>
  )
}
