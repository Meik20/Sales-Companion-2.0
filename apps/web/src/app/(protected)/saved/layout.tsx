import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recherches sauvegardées'
}

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

