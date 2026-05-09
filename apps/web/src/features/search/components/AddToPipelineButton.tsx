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
  [key: string]: unknown
}

type Props = { company: Company }

export function AddToPipelineButton({ company }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleAdd() {
    if (!user || status === 'loading' || status === 'done') return
    setStatus('loading')
    setErrorMsg(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/pipeline/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId:     company.id,
          companyName:   company.raisonSociale ?? '—',
          companySector: company.sector ?? null,
          companyCity:   company.city ?? company.region ?? null,
          companyPhone:  company.telephone ?? null,
          companyEmail:  company.email ?? null,
          managerUid:    user.role === 'member' ? (user.managerUid ?? null) : user.uid,
          // Passer l'identité de l'assigné pour qu'il soit affiché correctement
          assignedTo:     user.uid,
          memberName:     user.name || user.email,
          memberAccessId: user.accessId ?? null,
          googlePlaceId:  company._source === 'google_places' ? company.id : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
      setStatus('done')
    } catch (err) {
      console.error('[AddToPipeline]', err)
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <span style={{ fontSize: 12, color: colors.green, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {t('search.inPipeline')}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={() => void handleAdd()}
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
            (e.currentTarget as HTMLButtonElement).style.background = colors.greenLight
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = colors.green
            ;(e.currentTarget as HTMLButtonElement).style.color = colors.greenDark
          }
        }}
        onMouseLeave={(e) => {
          if (status === 'idle') {
            (e.currentTarget as HTMLButtonElement).style.background = colors.surface
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = colors.border
            ;(e.currentTarget as HTMLButtonElement).style.color = colors.text
          }
        }}
      >
        {status === 'loading' ? t('search.adding') : status === 'error' ? t('search.retry') : t('search.addPipeline')}
      </button>
      {errorMsg && (
        <span style={{ fontSize: 10.5, color: '#ef4444', maxWidth: 120, textAlign: 'right', lineHeight: 1.3 }}>
          {errorMsg}
        </span>
      )}
    </div>
  )
}
