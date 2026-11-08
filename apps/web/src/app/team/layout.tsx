import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Équipe'
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

