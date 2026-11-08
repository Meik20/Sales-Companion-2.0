import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Abonnement'
}

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

