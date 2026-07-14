'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'

type SupportLink = {
  id: string
  agentUid: string
  agentAccessId: string
  agentName: string
  grantedAt: string
  status: string
}

export function CrossTeamSupportManager() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const [links, setLinks] = useState<SupportLink[]>([])
  const [loading, setLoading] = useState(false)
  const [inputId, setInputId] = useState('')
  const [linking, setLinking] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/support-links', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setLinks(await res.json())
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { void fetchLinks() }, [fetchLinks])

  async function handleLink() {
    if (!user || !inputId.trim()) return
    setLinking(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/support-links', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentAccessId: inputId.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      pushToast({ type: 'success', title: `✅ Agent "${data.agentName || inputId}" lié avec succès à votre équipe.` })
      setInputId('')
      void fetchLinks()
    } catch (e: any) {
      pushToast({ type: 'error', title: e.message })
    } finally { setLinking(false) }
  }

  async function handleRevoke(linkId: string, agentName: string) {
    if (!user || !confirm(`Révoquer l'accès de ${agentName} à votre équipe ?`)) return
    setRevoking(linkId)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/team/support-links/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Erreur lors de la révocation')
      pushToast({ type: 'success', title: `Accès de ${agentName} révoqué.` })
      void fetchLinks()
    } catch (e: any) {
      pushToast({ type: 'error', title: e.message })
    } finally { setRevoking(null) }
  }

  if (user?.role !== 'manager') return null

  return (
    <div style={{
      background: colors.bg2,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
      marginTop: 24
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: colors.text,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          🔗 Agents Support — Accès Cross-Équipe
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid, lineHeight: 1.6 }}>
          Invitez un agent support d'une autre équipe (même organisation) à accéder aux clients conclus de votre équipe.
          L'agent doit vous fournir son <strong style={{ color: colors.text }}>Access ID</strong> (ex : <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>prenomnom@entreprise</code>).
        </p>
      </div>

      {/* Link form */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20,
        padding: 16, background: 'rgba(55,138,221,0.05)',
        border: `1px solid rgba(55,138,221,0.15)`, borderRadius: 12
      }}>
        <input
          type="text"
          placeholder="Access ID de l'agent (ex: kevinmbaye@myimmo)"
          value={inputId}
          onChange={e => setInputId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleLink()}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: colors.bg,
            color: colors.text, fontSize: 13, fontFamily: 'inherit', outline: 'none'
          }}
        />
        <button
          onClick={() => void handleLink()}
          disabled={linking || !inputId.trim()}
          style={{
            padding: '10px 20px', borderRadius: 8,
            background: linking || !inputId.trim() ? colors.bg3 : 'var(--color-primary)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: linking || !inputId.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'all 150ms', whiteSpace: 'nowrap'
          }}
        >
          {linking ? '⏳ Liaison…' : '🔗 Lier l\'agent'}
        </button>
      </div>

      {/* Linked agents list */}
      {loading ? (
        <p style={{ color: colors.textMid, fontSize: 13, textAlign: 'center' }}>Chargement…</p>
      ) : links.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 16px',
          color: colors.textMid, fontSize: 13
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
          <p style={{ margin: 0, fontWeight: 600, color: colors.text }}>Aucun agent lié pour l'instant</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
            Saisissez l'Access ID d'un agent support pour lui accorder l'accès à vos clients.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 4px' }}>
            {links.length} agent{links.length > 1 ? 's' : ''} lié{links.length > 1 ? 's' : ''} à votre équipe
          </p>
          {links.map(link => (
            <div key={link.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(74,222,128,0.05)',
              border: `1px solid rgba(74,222,128,0.15)`
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                  🎧 {link.agentName}
                </div>
                <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                  {link.agentAccessId} · Lié le {new Date(link.grantedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <button
                onClick={() => void handleRevoke(link.id, link.agentName)}
                disabled={revoking === link.id}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)',
                  color: '#f87171', cursor: revoking === link.id ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 150ms'
                }}
              >
                {revoking === link.id ? '…' : '✕ Révoquer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
