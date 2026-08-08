'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'

const PLAN_COLOR: Record<string, string> = {
  Gratuit: '#888',
  Starter: '#1a73e8',
  Pro: '#f39c12',
  Entreprise: '#1B7A3E'
}

export default function AdminConfigPage() {
  const { user } = useCurrentUser()
  const [apiKey, setApiKey] = useState('')
  const [newPass, setNewPass] = useState('')
  const [apiMsg, setApiMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const { t } = useTranslation()

  const PLAN_ROWS = [
    {
      plan: 'Gratuit',
      daily: '10',
      price: '—',
      target: t('admin.targetFree') || 'Essai / découverte'
    },
    {
      plan: 'Starter',
      daily: '50',
      price: '5 000 FCFA',
      target: t('admin.targetStarter') || 'Commerciaux indépendants'
    },
    {
      plan: 'Pro',
      daily: '200',
      price: '15 000 FCFA',
      target: t('admin.targetPro') || 'Équipes commerciales, PME'
    },
    {
      plan: 'Entreprise',
      daily: '1 000',
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
        setApiMsg({ type: 'ok', text: '✅ Clé API enregistrée — tableau de bord mis à jour' })
        setApiKey('')
      } else {
        const d = await res.json()
        setApiMsg({ type: 'err', text: `❌ ${d.error ?? 'Erreur serveur'}` })
      }
    } catch (e) {
      setApiMsg({ type: 'err', text: `❌ Erreur réseau` })
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
        setPassMsg({ type: 'ok', text: '✅ Mot de passe modifié' })
        setNewPass('')
      } else {
        const d = await res.json()
        setPassMsg({ type: 'err', text: `❌ ${d.error ?? 'Erreur'}` })
      }
    } catch {
      setPassMsg({ type: 'err', text: '❌ Erreur réseau' })
    } finally {
      setChangingPass(false)
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
    background: '#4ade80',
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
    color: type === 'ok' ? '#4ade80' : '#f87171'
  })

  return (
    <AppShell>
      <PageHeader title={t('admin.configTitle')} subtitle={t('admin.configSubtitle')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* API Key */}
        <div style={card}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--foreground, #f1f5f9)',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
            }}
          >
            🔑 {t('admin.apiKeyGroq')}
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
          {apiMsg && <div style={msgStyle(apiMsg.type)}>{apiMsg.text}</div>}
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
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
            }}
          >
            🔒 {t('admin.adminSecurity')}
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
          {passMsg && <div style={msgStyle(passMsg.type)}>{passMsg.text}</div>}
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
            borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
          }}
        >
          💳 {t('admin.pricingPlans')}
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
    </AppShell>
  )
}
