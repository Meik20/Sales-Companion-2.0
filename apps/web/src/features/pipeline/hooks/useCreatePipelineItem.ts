'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, firestore } from '@/services/firebase/client'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

type PipelineItemInput = {
  userId: string
  managerUid: string | null
  assignedTo?: string | null
  memberName?: string | null
  memberAccessId?: string | null
  companyId: string | null
  companyName: string
  companySector?: string
  companyCity?: string
  companyRegion?: string
  companyQuarter?: string
  companyPhone?: string
  companyEmail?: string
  country?: string
  status: string
  amount?: number
  currency?: string
  note?: string
  nextAction?: string
  nextDate: string | null
  enteredAt?: string | null
  assignedAt?: string | null
  createdAt: null
  updatedAt: null
}

export function useCreatePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PipelineItemInput) => {
      const currentUser = auth.currentUser
      // Appel API serveur pour synchronisation atomique Firestore Admin + Supabase private_prospects
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken()
          const res = await fetch('/api/pipeline/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              companyName: input.companyName,
              companyPhone: input.companyPhone || null,
              companyEmail: input.companyEmail || null,
              companyCity: input.companyCity || null,
              companyRegion: input.companyRegion || null,
              companyQuarter: input.companyQuarter || null,
              companySector: input.companySector || null,
              country: input.country || 'CM',
              companyCountry: input.country || 'CM',
              status: input.status || 'prospection',
              amount: input.amount,
              currency: input.currency || 'FCFA',
              note: input.note || '',
              nextAction: input.nextAction || null,
              nextDate: input.nextDate || null
            })
          })

          if (res.ok) {
            const data = await res.json()
            return { id: data.id }
          }
          if (res.status === 409) {
            const data = (await res.json().catch(() => ({}))) as { message?: string; conflict?: unknown }
            const err = new Error(data.message || 'Ce prospect est déjà pris en charge dans votre segment.') as any
            err.code = 'PROSPECT_ALREADY_EXISTS_IN_SEGMENT'
            err.conflict = data.conflict
            throw err
          }
          console.warn('[useCreatePipelineItem] Server add failed, fallback to client firestore:', res.status)
        } catch (apiErr: any) {
          if (apiErr?.code === 'PROSPECT_ALREADY_EXISTS_IN_SEGMENT') {
            throw apiErr
          }
          console.warn('[useCreatePipelineItem] Error calling server API, fallback to client firestore:', apiErr)
        }
      }

      // Fallback direct client Firestore (mode dégradé / offline)
      const nowIso = new Date().toISOString()
      return addDoc(collection(firestore, 'pipeline'), {
        ...input,
        phone: input.companyPhone || null,
        email: input.companyEmail || null,
        region: input.companyRegion || null,
        quarter: input.companyQuarter || null,
        enteredAt: input.enteredAt || nowIso,
        assignedAt: input.assignedAt || (input.assignedTo ? nowIso : null),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
      // Sync pipeline consolidé du Senior Manager (vue org)
      await queryClient.invalidateQueries({ queryKey: ['org-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['org-report'] })
    }
  })
}
