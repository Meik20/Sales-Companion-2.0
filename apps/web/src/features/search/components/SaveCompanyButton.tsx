'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

type Company = {
  id: string
  raisonSociale?: string
  sector?: string
  region?: string
  city?: string
  telephone?: string
  email?: string
}

type Props = { company: Company }

export function SaveCompanyButton({ company }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'duplicate' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSave() {
    if (!user || status === 'loading' || status === 'done' || status === 'duplicate') return
    setStatus('loading')
    setErrorMsg(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/saved-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId:    company.id,
          raisonSociale: company.raisonSociale ?? '—',
          sector:       company.sector ?? null,
          region:       company.region ?? null,
          city:         company.city ?? null,
          telephone:    company.telephone ?? null,
          email:        company.email ?? null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
      setStatus((json as { duplicate?: boolean }).duplicate ? 'duplicate' : 'done')
    } catch (err) {
      console.error('[SaveCompany]', err)
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  const isDone = status === 'done' || status === 'duplicate'

  if (isDone) {
    return (
      <span style={{ fontSize: 12, color: colors.green, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {status === 'duplicate' ? t('search.alreadySaved') : `✓ ${t('search.saved')}`}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={() => void handleSave()}
        disabled={status === 'loading'}
        style={{
          height: 32,
          padding: '0 12px',
          borderRadius: 8,
          border: `1px solid ${status === 'error' ? '#ef4444' : colors.border}`,
          background: status === 'error' ? 'rgba(239,68,68,0.08)' : colors.surface,
          color: status === 'error' ? '#ef4444' : colors.text,
          fontSize: 12,
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' ? 0.6 : 1,
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          if (status === 'idle') {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.08)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#60a5fa'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#3b82f6'
          }
        }}
        onMouseLeave={(e) => {
          if (status === 'idle') {
            ;(e.currentTarget as HTMLButtonElement).style.background = colors.surface
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = colors.border
            ;(e.currentTarget as HTMLButtonElement).style.color = colors.text
          }
        }}
      >
        {status === 'loading' ? t('search.saving') : status === 'error' ? t('search.retry') : `🔖 ${t('search.save')}`}
      </button>
      {errorMsg && (
        <span style={{ fontSize: 10.5, color: '#ef4444', maxWidth: 120, textAlign: 'right', lineHeight: 1.3 }}>
          {errorMsg}
        </span>
      )}
    </div>
  )
}
