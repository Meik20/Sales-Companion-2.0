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

type Props = { company: Company }

export function AddToPipelineButton({ company }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function notifySuccess() {
    setStatus('done')
    pushToast({
      type: 'success',
      title: t('search.prospectAddedToast'),
      description: `${company.raisonSociale || 'Prospect'}`
    })
  }

  async function handleAdd() {
    if (!user || status === 'loading' || status === 'done') return
    setStatus('loading'); setErrorMsg(null)

    const isOffline = isMobileRuntime() && typeof navigator !== 'undefined' && !navigator.onLine

    const pipelineData = {
      userId: user.uid,
      companyId: company.id,
      companyName: company.raisonSociale ?? '—',
      name: company.raisonSociale ?? '—',
      companySector: company.sector ?? null,
      companyCity: company.city ?? company.region ?? null,
      companyPhone: company.telephone ?? null,
      companyEmail: company.email ?? null,
      managerUid: user.role === 'member' ? (user.managerUid ?? null) : user.uid,
      assignedTo: user.uid,
      memberName: user.name || user.email,
      memberAccessId: user.accessId ?? null,
      googlePlaceId: company._source === 'google_places' ? company.id : null,
      status: 'prospection',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    if (isOffline) {
      try {
        await addDoc(collection(firestore, 'pipeline'), pipelineData)
        await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
        await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
        notifySuccess()
      } catch (err) {
        console.error('[AddToPipeline offline]', err)
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
      }
      return
    }

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/pipeline/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyId: company.id,
          companyName: company.raisonSociale ?? '—',
          companySector: company.sector ?? null,
          companyCity: company.city ?? company.region ?? null,
          companyPhone: company.telephone ?? null,
          companyEmail: company.email ?? null,
          managerUid: user.role === 'member' ? (user.managerUid ?? null) : user.uid,
          assignedTo: user.uid,
          memberName: user.name || user.email,
          memberAccessId: user.accessId ?? null,
          googlePlaceId: company._source === 'google_places' ? company.id : null
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
      notifySuccess()
    } catch (err) {
      // If network fails, try direct offline save
      if (!isMobileRuntime()) {
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
        return
      }
      try {
        await addDoc(collection(firestore, 'pipeline'), pipelineData)
        await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
        await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
        notifySuccess()
      } catch (addErr) {
        console.error('[AddToPipeline]', addErr)
        setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
      }
    }
  }


  if (status === 'done') {
    return (
      <span className="whitespace-nowrap text-[12px] font-semibold text-blue-400">
        {t('search.inPipeline')}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void handleAdd()}
        disabled={status === 'loading'}
        className={`h-8 whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold transition-all duration-150 ${
          status === 'error'
            ? 'border border-red-500/40 bg-red-500/8 text-red-400'
            : 'border border-border bg-secondary text-foreground hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400'
        } ${status === 'loading' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        {status === 'loading' ? t('search.adding') : status === 'error' ? t('search.retry') : t('search.addPipeline')}
      </button>
      {errorMsg && (
        <span className="max-w-[120px] text-right text-[10.5px] leading-tight text-red-400">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
