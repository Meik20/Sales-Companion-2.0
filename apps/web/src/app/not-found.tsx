import Link from 'next/link'
import { EmptyState } from '@/components/feedback'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <EmptyState
        illustration="/illustrations/empty-states/empty-search.png"
        illustrationSize="lg"
        title="Page introuvable"
        description="Désolé, la page que vous recherchez n'existe pas ou a été déplacée."
        action={{
          label: "Retour à l'accueil",
          href: '/',
          variant: 'primary'
        }}
      />
    </div>
  )
}
