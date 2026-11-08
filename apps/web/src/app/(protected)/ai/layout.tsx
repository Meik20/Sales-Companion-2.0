import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Companion IA'
}

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

