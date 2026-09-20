'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useQueryClient } from '@tanstack/react-query'

type Props = { company: Company }

export function SaveCompanyButton({ company }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'duplicate' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSave() {
    if (!user || status === 'loading' || status === 'done' || status === 'duplicate') return
    setStatus('loading'); setErrorMsg(null)

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    if (isOffline) {
      try {
        await addDoc(collection(firestore, 'saved_companies'), {
          userId: user.uid,
          companyId: company.id,
          raisonSociale: company.raisonSociale ?? '—',
          sector: company.sector ?? null,
          region: company.region ?? null,
          city: company.city ?? null,
          telephone: company.telephone ?? null,
          email: company.email ?? null,
          savedAt: serverTimestamp()
        })
        await queryClient.invalidateQueries({ queryKey: ['saved-companies', user.uid] })
        setStatus('done')
      } catch (err) {
        console.error('[SaveCompany offline]', err)
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
      }
      return
    }

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/saved-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyId: company.id,
          raisonSociale: company.raisonSociale ?? '—',
          sector: company.sector ?? null,
          region: company.region ?? null,
          city: company.city ?? null,
          telephone: company.telephone ?? null,
          email: company.email ?? null
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      await queryClient.invalidateQueries({ queryKey: ['saved-companies', user.uid] })
      setStatus((json as { duplicate?: boolean }).duplicate ? 'duplicate' : 'done')
    } catch (err) {
      // If network error, try offline save directly
      try {
        await addDoc(collection(firestore, 'saved_companies'), {
          userId: user.uid,
          companyId: company.id,
          raisonSociale: company.raisonSociale ?? '—',
          sector: company.sector ?? null,
          region: company.region ?? null,
          city: company.city ?? null,
          telephone: company.telephone ?? null,
          email: company.email ?? null,
          savedAt: serverTimestamp()
        })
        await queryClient.invalidateQueries({ queryKey: ['saved-companies', user.uid] })
        setStatus('done')
      } catch (saveErr) {
        console.error('[SaveCompany]', saveErr)
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
      }
    }
  }


  const isDone = status === 'done' || status === 'duplicate'
  if (isDone) {
    return (
      <span className="whitespace-nowrap text-[12px] font-semibold text-blue-400">
        {status === 'duplicate' ? t('search.alreadySaved') : `✓ ${t('search.saved')}`}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void handleSave()}
        disabled={status === 'loading'}
        className={`h-8 whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold transition-all duration-150 ${
          status === 'error'
            ? 'border border-red-500/40 bg-red-500/8 text-red-400'
            : 'border border-border bg-secondary text-foreground hover:border-blue-400/60 hover:bg-blue-400/8 hover:text-blue-400'
        } ${status === 'loading' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        {status === 'loading' ? t('search.saving') : status === 'error' ? t('search.retry') : `🔖 ${t('search.save')}`}
      </button>
      {errorMsg && (
        <span className="max-w-[120px] text-right text-[10.5px] leading-tight text-red-400">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
