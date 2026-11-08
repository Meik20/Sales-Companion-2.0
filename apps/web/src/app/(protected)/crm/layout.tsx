import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CRM Clients'
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

