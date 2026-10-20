'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root application error:', error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f7f8fa', color: '#101828' }}>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '420px', width: '100%', padding: '32px 24px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e6e8ec' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', fontWeight: 'bold' }}>
              !
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#101828' }}>
              Une anomalie est survenue
            </h2>
            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 24px', lineHeight: 1.5 }}>
              L'affichage a rencontré un conflit inattendu. Cliquez sur le bouton ci-dessous pour recharger l'interface.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload()
                } else {
                  reset()
                }
              }}
              style={{
                display: 'inline-block',
                width: '100%',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#2F5BEA',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Recharger l'affichage
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
