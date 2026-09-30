'use client'

import { PropsWithChildren } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { usePipelineRealtimeSync } from '@/features/pipeline/hooks/usePipelineRealtimeSync'

function PipelineSyncWrapper({ children }: PropsWithChildren) {
  usePipelineRealtimeSync()
  return <>{children}</>
}

/** Garde d’auth pour toutes les pages du groupe (protected), y compris /ai sans AppShell. */
export default function ProtectedLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <PipelineSyncWrapper>{children}</PipelineSyncWrapper>
    </AuthGuard>
  )
}
