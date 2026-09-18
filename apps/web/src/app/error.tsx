'use client'

import { useEffect } from 'react'
import { EmptyState } from '@/components/feedback'

export default function GlobalErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <EmptyState
        illustration="/illustrations/empty-states/error-state.png"
        illustrationSize="lg"
        title="Une erreur est survenue"
        description="Une anomalie inattendue s'est produite lors du chargement. Vous pouvez réessayer."
        action={{
          label: 'Réessayer',
          onClick: () => reset(),
          variant: 'primary'
        }}
      />
    </div>
  )
}
