import { ReactNode } from 'react'
import '@/features/landing/styles/landing.css'

/**
 * Layout centralisé pour toutes les pages publiques :
 * /, /blog, /annuaire, /login, /register, /privacy, /terms, etc.
 *
 * Ce wrapper applique le thème Dark Glassmorphism (fond bleu nuit,
 * lueurs animées, typographie Inter) à toutes ces pages de façon
 * cohérente, sans impacter l'interface du CRM (routes /protected).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-layout">
      {/* ── Halo lumineux animés — présents sur toutes les pages publiques ── */}
      <div className="public-glow public-glow-tl" aria-hidden="true" />
      <div className="public-glow public-glow-br" aria-hidden="true" />
      <div className="public-glow public-glow-mid" aria-hidden="true" />

      {/* ── Contenu de la page ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
