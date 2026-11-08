import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mon Profil'
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

