'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useToast } from '@/hooks/useToast'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useQueryClient } from '@tanstack/react-query'
import { isMobileRuntime } from '@/lib/runtime'

import { Plus, Check } from 'lucide-react'

type Props = { company: Company }

export function AddToPipelineButton({ company }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const prospectingCountry = useProspectingCountry()
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

  async function handleAdd(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!user || status === 'loading' || status === 'done') return
    setStatus('loading')
    setErrorMsg(null)

    const isOffline = isMobileRuntime() && typeof navigator !== 'undefined' && !navigator.onLine

    const isManager = user.role === 'manager' || (!user.role && !user.managerUid)
    const targetCountry = (company.country as string) || prospectingCountry
    const pipelineData = {
      userId: user.uid,
      companyId: company.id,
      companyName: company.raisonSociale ?? '—',
      name: company.raisonSociale ?? '—',
      companySector: company.sector ?? null,
      companyCity: company.city ?? company.region ?? null,
      companyCountry: targetCountry,
      country: targetCountry,
      companyPhone: company.telephone ?? null,
      companyEmail: company.email ?? null,
      managerUid: user.role === 'member' ? (user.managerUid ?? null) : user.uid,
      orgCode: user.orgCode ?? null,
      segment: user.segment ?? null,
      seniorManagerUid:
        user.seniorManagerUid ?? (user.orgRole === 'senior_manager' ? user.uid : null),
      assignedTo: isManager ? null : user.uid,
      memberName: isManager ? null : user.name || user.email,
      memberAccessId: isManager ? null : (user.accessId ?? null),
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
          companyCountry: targetCountry,
          country: targetCountry,
          companyPhone: company.telephone ?? null,
          companyEmail: company.email ?? null,
          managerUid: user.role === 'member' ? (user.managerUid ?? null) : user.uid,
          assignedTo: user.role === 'member' ? user.uid : null,
          memberName: user.role === 'member' ? user.name || user.email : null,
          memberAccessId: user.role === 'member' ? (user.accessId ?? null) : null,
          userRole: user.role ?? null,
          googlePlaceId: company._source === 'google_places' ? company.id : null
        })
      })
      const json = (await res.json().catch(() => ({}))) as {
        message?: string
        code?: string
        error?: string
      }
      if (!res.ok) {
        if (
          json.code === 'CROSS_COUNTRY_REQUIRES_ENTERPRISE' ||
          json.error === 'cross_country_restricted'
        ) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('sc_cross_country_locked', {
                detail: { targetCountry }
              })
            )
          }
        }
        throw new Error(json.message ?? `Erreur ${res.status}`)
      }
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
      notifySuccess()
    } catch (err) {
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
      <span className="whitespace-nowrap text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-2xs">
        <Check size={13} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
        <span>{t('search.inPipeline')}</span>
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAdd}
        disabled={status === 'loading'}
        className={`h-8 whitespace-nowrap rounded-lg px-3.5 text-[12px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs ${
          status === 'error'
            ? 'border border-red-500/40 bg-red-500/8 text-red-600 dark:text-red-400'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs hover:shadow-xs active:scale-95'
        } ${status === 'loading' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        {status === 'loading' ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{t('search.adding')}</span>
          </>
        ) : status === 'error' ? (
          t('search.retry')
        ) : (
          <>
            <Plus size={13} strokeWidth={2.5} />
            <span>{t('search.addPipeline')}</span>
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
