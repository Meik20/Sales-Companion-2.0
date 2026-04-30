'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCreatePipelineItem } from '@/features/pipeline/hooks/useCreatePipelineItem'
import { useToast } from '@/hooks/useToast'

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

export function AddToPipelineButton({ company }: Props) {
  const { user } = useCurrentUser()
  const mutation = useCreatePipelineItem()
  const { pushToast } = useToast()
  const [done, setDone] = useState(false)

  async function handleAdd() {
    if (!user) return

    try {
      await mutation.mutateAsync({
        userId:        user.uid,
        managerUid:    user.role === 'member' ? (user.managerUid ?? null) : user.uid,
        companyId:     company.id,
        companyName:   company.raisonSociale ?? '-',
        companySector: company.sector,
        companyCity:   company.city ?? company.region,
        companyPhone:  company.telephone,
        companyEmail:  company.email,
        status:        'prospection',
        createdAt:     null,
        updatedAt:     null,
      })
      setDone(true)
      pushToast({ type: 'success', title: 'Ajouté au pipeline' })
    } catch {
      pushToast({ type: 'error', title: "Impossible d'ajouter au pipeline" })
    }
  }

  if (done) {
    return (
      <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
        ✓ Dans le pipeline
      </span>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      loading={mutation.isPending}
      onClick={() => void handleAdd()}
    >
      + Pipeline
    </Button>
  )
}
