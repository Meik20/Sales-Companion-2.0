'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { EmptyState } from '@/components/feedback'
import { X, Link2, Loader2, Headphones, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react'

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
  const [orgData, setOrgData] = useState<{
    orgCode: string
    niu: string | null
    isVerified: boolean
    companyName: string
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const fetchOrg = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/org', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setOrgData(await res.json())
      }
    } catch {
      // non-bloquant
    }
  }, [user])

  const fetchLinks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/support-links', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setLinks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchLinks()
    void fetchOrg()
  }, [fetchLinks, fetchOrg])

  async function copyOrgCode() {
    const code = orgData?.orgCode || user?.orgCode
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(true)
      pushToast({
        type: 'success',
        title: `Code organisation (${code}) copié dans le presse-papiers.`
      })
      setTimeout(() => setCopiedCode(false), 2500)
    } catch {
      pushToast({ type: 'info', title: `Code organisation : ${code}` })
    }
  }

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
      pushToast({
        type: 'success',
        title: `Agent "${data.agentName || inputId}" lié avec succès à votre équipe.`
      })
      setInputId('')
      void fetchLinks()
    } catch (e: any) {
      pushToast({ type: 'error', title: e.message })
    } finally {
      setLinking(false)
    }
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
    } finally {
      setRevoking(null)
    }
  }

  if (user?.role !== 'manager') return null

  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
        borderRadius: 16,
        padding: 24,
        marginTop: 24
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: '0 0 4px',
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--foreground, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Link2 size={16} className="text-primary" /> Agents Support — Accès Cross-Équipe
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--muted-foreground, #94a3b8)',
            lineHeight: 1.6
          }}
        >
          Invitez un agent support d'une autre équipe (même organisation) à accéder aux clients
          conclus de votre équipe. L'agent doit vous fournir son{' '}
          <strong style={{ color: 'var(--foreground, #f1f5f9)' }}>Access ID</strong> (ex :{' '}
          <code
            style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}
          >
            jdupont@monentreprise
          </code>
          ).
        </p>
      </div>

      {/* Organisation Governance Info Card */}
      <div
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>
            Code Organisation :
          </span>
          <code
            style={{
              background: 'rgba(55,138,221,0.12)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: 13,
              padding: '3px 8px',
              borderRadius: 6,
              letterSpacing: '0.05em'
            }}
          >
            {orgData?.orgCode || user?.orgCode || 'Chargement…'}
          </code>
          <button
            type="button"
            onClick={() => void copyOrgCode()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--foreground, #f1f5f9)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {copiedCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copiedCode ? 'Copié !' : 'Copier'}
          </button>
        </div>

        <div>
          {orgData?.isVerified || Boolean(user?.niu) ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#4ade80',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 700
              }}
            >
              <ShieldCheck size={14} />
              Organisation vérifiée {orgData?.niu ? `(NIU: ${orgData.niu})` : ''}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(234,179,8,0.1)',
                border: '1px solid rgba(234,179,8,0.2)',
                color: '#facc15',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 600
              }}
            >
              <ShieldAlert size={14} />
              Organisation standard (NIU non configuré)
            </span>
          )}
        </div>
      </div>

      {/* Link form */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          padding: 16,
          background: 'rgba(55,138,221,0.05)',
          border: `1px solid rgba(55,138,221,0.15)`,
          borderRadius: 12
        }}
      >
        <input
          type="text"
          placeholder="Access ID de l'agent (ex: jdupont@monentreprise)"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleLink()}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            background: 'var(--background, #0b1120)',
            color: 'var(--foreground, #f1f5f9)',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
        <button
          onClick={() => void handleLink()}
          disabled={linking || !inputId.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background:
              linking || !inputId.trim() ? 'var(--secondary, #1e2a3b)' : 'var(--color-primary)',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: linking || !inputId.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all 150ms',
            whiteSpace: 'nowrap'
          }}
        >
          {linking ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" />
              Liaison…
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} />
              Lier l'agent
            </span>
          )}
        </button>
      </div>

      {/* Linked agents list */}
      {loading ? (
        <p style={{ color: 'var(--muted-foreground, #94a3b8)', fontSize: 13, textAlign: 'center' }}>
          Chargement…
        </p>
      ) : links.length === 0 ? (
        <EmptyState
          illustration="/illustrations/empty-states/no-support-agent.png"
          title="Aucun agent lié pour l'instant"
          description="Saisissez l'Access ID d'un agent support pour lui accorder l'accès à vos clients."
          illustrationSize="sm"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted-foreground, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              margin: '0 0 4px'
            }}
          >
            {links.length} agent{links.length > 1 ? 's' : ''} lié{links.length > 1 ? 's' : ''} à
            votre équipe
          </p>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(74,222,128,0.05)',
                border: `1px solid rgba(74,222,128,0.15)`
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--foreground, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Headphones size={13} style={{ opacity: 0.8, color: '#22c55e' }} />
                  {link.agentName}
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)', marginTop: 2 }}
                >
                  {link.agentAccessId} · Lié le{' '}
                  {new Date(link.grantedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <button
                onClick={() => void handleRevoke(link.id, link.agentName)}
                disabled={revoking === link.id}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid rgba(248,113,113,0.3)',
                  background: 'rgba(248,113,113,0.08)',
                  color: '#f87171',
                  cursor: revoking === link.id ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {revoking === link.id ? (
                  '…'
                ) : (
                  <>
                    <X size={13} />
                    <span>Révoquer</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
