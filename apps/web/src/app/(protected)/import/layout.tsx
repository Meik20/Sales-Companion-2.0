import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Importer mes prospects'
}

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

