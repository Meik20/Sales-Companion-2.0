'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateTeamAssignment } from './useCreateTeamAssignment'
import { useActiveTeamMembers } from './useTeamMembers'
import { useTeamAssignments } from './useTeamAssignments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Prospect } from '@/features/imports/components/ManagerProspectsList'
import { useTranslation } from '@/providers/I18nProvider'

export type PipelineItem = {
  id: string
  companyName: string
  status: string
  assignedTo?: string | null
  memberName?: string | null
  userId?: string | null
  managerUid?: string | null
  sourceProspectId?: string | null
}

interface UseCreateAssignmentFormParams {
  selectedProspects?: Prospect[]
  onAssigned?: () => void
}

export function useCreateAssignmentForm({
  selectedProspects = [],
  onAssigned
}: UseCreateAssignmentFormParams = {}) {
  const { t } = useTranslation()
  const [pipelineItemId, setPipelineItemId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [deadlineOption, setDeadlineOption] = useState<'24h' | '48h' | '7d' | 'custom' | 'none'>('48h')
  const [customDeadlineDate, setCustomDeadlineDate] = useState('')
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)

  const getCalculatedDeadlineIso = (): string | null => {
    const now = new Date()
    if (deadlineOption === '24h') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === '48h') {
      return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === '7d') {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === 'custom' && customDeadlineDate) {
      return new Date(customDeadlineDate).toISOString()
    }
    return null
  }

  const [pipelineProspects, setPipelineProspects] = useState<PipelineItem[]>([])
  const [loadingPipeline, setLoadingPipeline] = useState(false)

  const { user } = useCurrentUser()
  const { mutate: createAssignment, isPending } = useCreateTeamAssignment()
  const { data: members = [] } = useActiveTeamMembers()
  const { data: assignments = [] } = useTeamAssignments()
  const queryClient = useQueryClient()

  const loadPipeline = async () => {
    if (!user) {
      setPipelineProspects([])
      setLoadingPipeline(false)
      return
    }

    try {
      setLoadingPipeline(true)
      const token = await user.getIdToken()
      const res = await fetch('/api/pipeline/manager', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setPipelineProspects(data ?? [])
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingPipeline(false)
    }
  }

  useEffect(() => {
    void loadPipeline()
  }, [user])

  const normalizeCompName = (name?: string) =>
    (name || '').toLowerCase().trim().replace(/\s+/g, ' ')

  const assignedCompanyNames = new Set(assignments.map((a) => normalizeCompName(a.companyName)))
  const assignedItemIds = new Set(
    assignments.flatMap(
      (a) => [a.pipelineItemId, a.pipelineEntryId, a.id].filter(Boolean) as string[]
    )
  )

  const availableProspects = pipelineProspects.filter((p: PipelineItem) => {
    if (p.id && assignedItemIds.has(p.id)) return false
    if (p.sourceProspectId && assignedItemIds.has(p.sourceProspectId)) return false

    const normName = normalizeCompName(p.companyName)
    if (normName && assignedCompanyNames.has(normName)) return false

    const isAssignedToOtherMember =
      p.assignedTo &&
      p.assignedTo.trim() !== '' &&
      p.assignedTo !== user?.uid

    if (isAssignedToOtherMember) return false

    if (
      p.memberName &&
      p.memberName.trim() !== '' &&
      p.memberName !== user?.name &&
      p.memberName !== user?.email &&
      p.assignedTo !== user?.uid
    ) {
      return false
    }

    const belongsToManager =
      !p.managerUid || p.managerUid === user?.uid || p.userId === user?.uid
    if (!belongsToManager) return false

    return true
  })

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pipelineItemId.trim()) {
      setError(t('team.selectProspect'))
      return
    }
    if (!memberId.trim()) {
      setError(t('team.selectMember'))
      return
    }

    const selectedP = availableProspects.find((p) => p.id === pipelineItemId)
    const deadlineIso = getCalculatedDeadlineIso()
    createAssignment(
      {
        pipelineItemId: pipelineItemId.trim(),
        memberId: memberId.trim(),
        companyName: selectedP?.companyName,
        deadline: deadlineIso
      },
      {
        onSuccess: async () => {
          setPipelineItemId('')
          setMemberId('')
          setError('')
          setSuccessCount((n) => n + 1)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
            queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
            queryClient.invalidateQueries({ queryKey: ['team-assignments'] })
          ])
          void loadPipeline()
          onAssigned?.()
        },
        onError: (err: Error) => {
          setError(err.message || t('support.errorLoad'))
        }
      }
    )
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!memberId.trim()) {
      setError(t('team.selectMember'))
      return
    }

    const token = await user?.getIdToken()
    const deadlineIso = getCalculatedDeadlineIso()
    let done = 0
    for (const prospect of selectedProspects) {
      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          pipelineItemId: prospect.id,
          memberId: memberId.trim(),
          companyName: prospect.name || prospect.companyName || (prospect as any).raisonSociale,
          deadline: deadlineIso
        })
      })
      if (res.ok) done++
    }
    setSuccessCount((n) => n + done)
    setMemberId('')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['team-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    ])
    void loadPipeline()
    onAssigned?.()
  }

  return {
    pipelineItemId,
    setPipelineItemId,
    memberId,
    setMemberId,
    deadlineOption,
    setDeadlineOption,
    customDeadlineDate,
    setCustomDeadlineDate,
    error,
    successCount,
    availableProspects,
    loadingPipeline,
    members,
    isPending,
    hasBulk: selectedProspects.length > 0,
    handleSingleSubmit,
    handleBulkSubmit
  }
}
