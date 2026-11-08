import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Base Clients'
}

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

