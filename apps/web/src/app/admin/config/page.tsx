'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

const PLAN_ROWS = [
  { plan: 'Gratuit',    daily: '10',       price: '—',            target: 'Essai / découverte' },
  { plan: 'Starter',   daily: '200',      price: '5 000 FCFA',   target: 'Commerciaux indépendants' },
  { plan: 'Pro',       daily: '500',      price: '15 000 FCFA',  target: 'Équipes commerciales, PME' },
  { plan: 'Entreprise',daily: 'Illimité', price: '50 000 FCFA',  target: 'Grandes entreprises, cabinets' },
]

const PLAN_COLOR: Record<string, string> = {
  Gratuit: '#888', Starter: '#1a73e8', Pro: '#f39c12', Entreprise: '#1B7A3E',
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

  async function saveApiKey() {
    if (!apiKey.trim()) { setApiMsg({ type: 'err', text: 'Saisissez une clé API' }); return }
    setSaving(true)
    setApiMsg(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ key: 'groq_api_key', value: apiKey.trim() }),
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
    } finally { setSaving(false) }
  }

  async function changePassword() {
    if (!newPass || newPass.length < 6) { setPassMsg({ type: 'err', text: 'Minimum 6 caractères' }); return }
    setChangingPass(true)
    setPassMsg(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ newPassword: newPass }),
      })
      if (res.ok) {
        setPassMsg({ type: 'ok', text: '✅ Mot de passe modifié' })
        setNewPass('')
      } else {
        const d = await res.json()
        setPassMsg({ type: 'err', text: `❌ ${d.error ?? 'Erreur'}` })
      }
    } catch { setPassMsg({ type: 'err', text: '❌ Erreur réseau' }) }
    finally { setChangingPass(false) }
  }

  const card: React.CSSProperties = {
    background: colors.surface,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: '20px 22px',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }
  const inputStyle: React.CSSProperties = {
    width: '100%', maxWidth: 480, padding: '10px 14px',
    border: `1.5px solid ${colors.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: 'monospace', outline: 'none',
  }
  const btnStyle: React.CSSProperties = {
    padding: '9px 20px', background: colors.green, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', marginTop: 12,
  }
  const msgStyle = (type: 'ok' | 'err'): React.CSSProperties => ({
    marginTop: 10, fontSize: 13, fontWeight: 600,
    color: type === 'ok' ? colors.success : colors.danger,
  })

  return (
    <AppShell>
      <PageHeader title={t('admin.configTitle')} subtitle={t('admin.configSubtitle')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* API Key */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
            🔑 Clé API Groq
          </div>
          <label style={labelStyle}>Clé API Groq (pour l'assistant chat)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            style={inputStyle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey() }}
          />
          <p style={{ fontSize: 12, color: colors.textMid, marginTop: 6, lineHeight: 1.5, maxWidth: 480 }}>
            Obtenez votre clé gratuite sur <strong>console.groq.com/keys</strong>.<br />
            Utilisée uniquement pour l'assistant chat.
          </p>
          <button onClick={saveApiKey} disabled={saving} style={btnStyle}>
            {saving ? 'Enregistrement...' : 'Enregistrer la clé'}
          </button>
          {apiMsg && <div style={msgStyle(apiMsg.type)}>{apiMsg.text}</div>}
        </div>

        {/* Change password */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
            🔒 Sécurité admin
          </div>
          <label style={labelStyle}>Nouveau mot de passe</label>
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Minimum 6 caractères"
            style={{ ...inputStyle, fontFamily: 'inherit' }}
            onKeyDown={(e) => { if (e.key === 'Enter') changePassword() }}
          />
          <p style={{ fontSize: 12, color: colors.textMid, marginTop: 6, lineHeight: 1.5, maxWidth: 480 }}>
            {t('auth.newPassword')}
          </p>
          <button onClick={changePassword} disabled={changingPass} style={btnStyle}>
            {changingPass ? t('team.saving') : t('auth.resetPassword')}
          </button>
          {passMsg && <div style={msgStyle(passMsg.type)}>{passMsg.text}</div>}
        </div>
      </div>

      {/* Plans table */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
          💳 Plans tarifaires
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Plan', 'Recherches / jour', 'Prix mensuel recommandé', 'Cible'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: `1px solid ${colors.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.plan} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${PLAN_COLOR[row.plan]}18`, color: PLAN_COLOR[row.plan] }}>
                      {row.plan}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: colors.text }}>{row.daily}</td>
                  <td style={{ padding: '12px 14px', color: colors.textMid }}>{row.price}</td>
                  <td style={{ padding: '12px 14px', color: colors.textMid }}>{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
