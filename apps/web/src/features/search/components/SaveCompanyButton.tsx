'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useToast } from '@/hooks/useToast'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useQueryClient } from '@tanstack/react-query'
import { isMobileRuntime } from '@/lib/runtime'
import { Bookmark, Check } from 'lucide-react'

type Props = { company: Company; iconOnly?: boolean }

export function SaveCompanyButton({ company, iconOnly = false }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'duplicate' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function notifyDone(isDuplicate = false) {
    setStatus(isDuplicate ? 'duplicate' : 'done')
    if (!isDuplicate) {
      pushToast({
        type: 'success',
        title: t('search.companySavedToast'),
        description: `${company.raisonSociale || 'Entreprise'}`
      })
    }
  }

  async function handleSave(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!user || status === 'loading' || status === 'done' || status === 'duplicate') return
    setStatus('loading')
    setErrorMsg(null)

    const isOffline = isMobileRuntime() && typeof navigator !== 'undefined' && !navigator.onLine

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
        notifyDone()
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
      if (!isMobileRuntime()) {
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
        return
      }
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

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'loading'}
        title={isDone ? t('search.alreadySaved') : t('search.save')}
        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 border cursor-pointer ${
          isDone
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/80 bg-background/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
        } ${status === 'loading' ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
      >
        {isDone ? (
          <Bookmark size={14} className="fill-current" />
        ) : (
          <Bookmark size={14} strokeWidth={1.8} />
        )}
      </button>
    )
  }

  if (isDone) {
    return (
      <span className="whitespace-nowrap text-[12px] font-bold text-primary inline-flex items-center gap-1">
        {status === 'duplicate' ? (
          t('search.alreadySaved')
        ) : (
          <>
            <Check size={13} strokeWidth={3} />
            <span>{t('search.saved')}</span>
          </>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSave}
        disabled={status === 'loading'}
        className={`h-8 whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5 ${
          status === 'error'
            ? 'border border-red-500/40 bg-red-500/8 text-red-600 dark:text-red-400'
            : 'border border-border bg-secondary text-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary'
        } ${status === 'loading' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
      >
        {status === 'loading' ? (
          t('search.saving')
        ) : status === 'error' ? (
          t('search.retry')
        ) : (
          <>
            <Bookmark size={13} />
            <span>{t('search.save')}</span>
          </>
        )}
      </button>
      {errorMsg && (
        <span className="max-w-[120px] text-right text-[10.5px] leading-tight text-red-400">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
