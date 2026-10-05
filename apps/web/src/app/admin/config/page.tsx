'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'

import { Key, Lock, CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Users } from 'lucide-react'
import { PLAN_LIMITS } from '@sales-companion/shared'

const PLAN_COLOR: Record<string, string> = {
  Gratuit: '#888',
  Starter: '#1a73e8',
  Pro: '#f39c12',
  Entreprise: '#1B7A3E'
}

export default function AdminConfigPage() {
  const { user } = useCurrentUser()
  const [apiKey, setApiKey] = useState('')
  const [hasGroqKey, setHasGroqKey] = useState<boolean | null>(null)
  const [newPass, setNewPass] = useState('')
  const [apiMsg, setApiMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user.getIdToken().then((token) => {
      fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && typeof data.groq_api_key === 'boolean') {
            setHasGroqKey(data.groq_api_key)
          }
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const PLAN_ROWS = [
    {
      plan: 'Gratuit',
      daily: `${PLAN_LIMITS.free} / mois`,
      price: '—',
      target: t('admin.targetFree') || 'Essai / découverte'
    },
    {
      plan: 'Starter',
      daily: `${PLAN_LIMITS.starter}`,
      price: '5 000 FCFA',
      target: t('admin.targetStarter') || 'Commerciaux indépendants'
    },
    {
      plan: 'Pro',
      daily: `${PLAN_LIMITS.pro}`,
      price: '15 000 FCFA',
      target: t('admin.targetPro') || 'Équipes commerciales, PME'
    },
    {
      plan: 'Entreprise',
      daily: `${PLAN_LIMITS.enterprise}`,
      price: '50 000 FCFA',
      target: t('admin.targetEnterprise') || 'Grandes entreprises, cabinets'
    }
  ]

  async function saveApiKey() {
    if (!apiKey.trim()) {
      setApiMsg({ type: 'err', text: 'Saisissez une clé API' })
      return
    }
    setSaving(true)
    setApiMsg(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ key: 'groq_api_key', value: apiKey.trim() })
      })
      if (res.ok) {
        setApiMsg({ type: 'ok', text: 'Clé API enregistrée — tableau de bord mis à jour' })
        setApiKey('')
        setHasGroqKey(true)
      } else {
        const d = await res.json()
        setApiMsg({ type: 'err', text: d.error ?? 'Erreur serveur' })
      }
    } catch (e) {
      setApiMsg({ type: 'err', text: 'Erreur réseau' })
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!newPass || newPass.length < 6) {
      setPassMsg({ type: 'err', text: 'Minimum 6 caractères' })
      return
    }
    setChangingPass(true)
    setPassMsg(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ newPassword: newPass })
      })
      if (res.ok) {
        setPassMsg({ type: 'ok', text: 'Mot de passe modifié' })
        setNewPass('')
      } else {
        const d = await res.json()
        setPassMsg({ type: 'err', text: d.error ?? 'Erreur' })
      }
    } catch {
      setPassMsg({ type: 'err', text: 'Erreur réseau' })
    } finally {
      setChangingPass(false)
    }
  }

  async function syncTeamPlans() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/users/sync-team-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ syncAll: true })
      })
      const data = await res.json()
      if (res.ok) {
        setSyncMsg({
          type: 'ok',
          text: `✅ ${data.managersProcessed} managers synchronisés — ${data.totalUsersUpdated} utilisateurs, ${data.totalAccessesUpdated} accès mis à jour`
        })
      } else {
        setSyncMsg({ type: 'err', text: data.error ?? 'Erreur serveur' })
      }
    } catch {
      setSyncMsg({ type: 'err', text: 'Erreur réseau' })
    } finally {
      setSyncing(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--secondary, #1e2a3b)',
    borderRadius: 12,
    border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
    padding: '20px 22px'
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--foreground, #f1f5f9)',
    marginBottom: 6
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
    padding: '10px 14px',
    border: `1.5px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none'
  }
  const btnStyle: React.CSSProperties = {
    padding: '9px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 12
  }
  const msgStyle = (type: 'ok' | 'err'): React.CSSProperties => ({
    marginTop: 10,
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: type === 'ok' ? '#60a5fa' : '#f87171'
  })

  return (
    <AppShell>
      <PageHeader title={t('admin.configTitle')} subtitle={t('admin.configSubtitle')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* API Key */}
        <div style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground, #f1f5f9)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} className="text-primary" />
              <span>{t('admin.apiKeyGroq')}</span>
            </span>
            {hasGroqKey !== null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: hasGroqKey ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: hasGroqKey ? '#22c55e' : '#ef4444'
                }}
              >
                {hasGroqKey ? '● Configurée' : '○ Non configurée'}
              </span>
            )}
          </div>
          <label style={labelStyle}>{t('admin.apiKeyGroqLabel')}</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('admin.apiKeyGroqPlaceholder')}
            style={inputStyle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveApiKey()
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: 'var(--muted-foreground, #94a3b8)',
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 480
            }}
          >
            {t('admin.apiKeyGroqHelp1')}
            <strong>console.groq.com/keys</strong>
            {t('admin.apiKeyGroqHelp2')}
          </p>
          <button onClick={saveApiKey} disabled={saving} style={btnStyle}>
            {saving ? t('team.saving') : t('admin.saveApiKey')}
          </button>
          {apiMsg && (
            <div style={msgStyle(apiMsg.type)}>
              {apiMsg.type === 'ok' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
              <span>{apiMsg.text}</span>
            </div>
          )}
        </div>

        {/* Change password */}
        <div style={card}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--foreground, #f1f5f9)',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Lock size={16} className="text-primary" />
            <span>{t('admin.adminSecurity')}</span>
          </div>
          <label style={labelStyle}>{t('admin.newPassword')}</label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={t('admin.newPasswordPlaceholder')}
            style={{ ...inputStyle, fontFamily: 'inherit' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') changePassword()
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: 'var(--muted-foreground, #94a3b8)',
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 480
            }}
          >
            {t('admin.newPasswordHelp')}
          </p>
          <button onClick={changePassword} disabled={changingPass} style={btnStyle}>
            {changingPass ? t('team.saving') : t('admin.changePassword')}
          </button>
          {passMsg && (
            <div style={msgStyle(passMsg.type)}>
              {passMsg.type === 'ok' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
              <span>{passMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Plans table */}
      <div style={card}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--foreground, #f1f5f9)',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CreditCard size={16} className="text-primary" />
          <span>{t('admin.pricingPlans')}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {[
                  t('admin.plan'),
                  t('admin.searchesPerDay'),
                  t('admin.recommendedMonthlyPrice'),
                  t('admin.target')
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--muted-foreground, #94a3b8)',
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.plan} style={{ borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}` }}>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: `${PLAN_COLOR[row.plan]}18`,
                        color: PLAN_COLOR[row.plan]
                      }}
                    >
                      {row.plan}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
                    {row.daily}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted-foreground, #94a3b8)' }}>{row.price}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted-foreground, #94a3b8)' }}>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Synchronisation équipes ────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground, #f1f5f9)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} className="text-primary" />
            <span>Synchronisation des équipes</span>
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)', marginBottom: 14, lineHeight: 1.6 }}>
          Propage le plan et la <strong>période de validité d'abonnement</strong> du Manager vers tous ses comptes associés
          (Membres d'équipe et Agents Support). À utiliser après une mise à jour manuelle de la validité du Manager.
        </p>
        <button
          id="sync-all-teams-btn"
          onClick={syncTeamPlans}
          disabled={syncing}
          style={{ ...btnStyle, background: syncing ? '#334155' : '#0d9488', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Synchronisation en cours…' : 'Synchroniser toutes les équipes'}
        </button>
        {syncMsg && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: syncMsg.type === 'ok' ? '#34d399' : '#f87171' }}>
            {syncMsg.text}
          </div>
        )}
      </div>
    </AppShell>
  )
}
