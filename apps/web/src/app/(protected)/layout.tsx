'use client'

import { PropsWithChildren } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { usePipelineRealtimeSync } from '@/features/pipeline/hooks/usePipelineRealtimeSync'
import { useOrgPipelineRealtimeSync } from '@/features/pipeline/hooks/useOrgPipeline'

function PipelineSyncWrapper({ children }: PropsWithChildren) {
  usePipelineRealtimeSync()
  // Sync temps réel du pipeline SM via onSnapshot sur organisations/{orgCode}.
  // No-op si l'utilisateur n'est pas senior_manager.
  useOrgPipelineRealtimeSync()
  return <>{children}</>
}

/** Garde d'auth pour toutes les pages du groupe (protected), y compris /ai sans AppShell. */
export default function ProtectedLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <PipelineSyncWrapper>{children}</PipelineSyncWrapper>
    </AuthGuard>
  )
}
