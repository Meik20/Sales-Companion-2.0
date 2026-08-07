import { ReactNode } from 'react'

/**
 * Layout centralisé pour les pages publiques (/, /login, /register, /privacy, /terms, etc.)
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      {children}
    </div>
  )
}
