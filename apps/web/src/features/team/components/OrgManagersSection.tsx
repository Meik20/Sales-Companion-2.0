'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/feedback'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Users2,
  Mail,
  Phone,
  Crown,
  User2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Filter,
  CheckCircle2,
  Calendar,
  Tag,
  UserMinus,
  ArrowRightLeft,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  X
} from 'lucide-react'
import { useOrgPipeline, type OrgManagerStats } from '@/features/pipeline/hooks/useOrgPipeline'

export interface OrgManager {
  uid: string
  name: string
  email: string
  phone?: string | null
  orgRole: string
  segment?: string | null
  seniorManagerUid?: string | null
  isCurrent: boolean
  isSenior: boolean
  createdAt?: string | null
}

interface TeamMemberRecord {
  id: string
  firebaseUid?: string | null
  email?: string
  firstname?: string
  lastname?: string
  role?: string
  status?: string
  activated?: boolean
  managerUid?: string
  managerName?: string
}

interface OrgManagersSectionProps {
  managers: OrgManager[]
  orgCode: string
  onRefresh?: () => void
}

/** Affiche les stats pipeline d'un manager en les croisant avec l'org pipeline query */
function ManagerStatsRow({
  manager,
  stats
}: {
  manager: OrgManager
  stats?: OrgManagerStats['stats']
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8
      }}
    >
      {[
        { label: t('pipeline.prospection'), value: stats?.prospection ?? '—', color: '#60a5fa' },
        { label: t('pipeline.negotiation'), value: stats?.negociation ?? '—', color: '#fbbf24' },
        { label: t('pipeline.concluded'), value: stats?.conclue ?? '—', color: '#34d399' },
        { label: t('common.total'), value: stats?.total ?? '—', color: '#a78bfa' }
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: 'var(--background)',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color,
              fontFamily: "'Syne',sans-serif",
              lineHeight: 1
            }}
          >
            {value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Modale de Passation de Service & Révocation d'un Team Manager.
 * 100% Opaque conforme à la règle 8 d'AGENTS.md.
 */
function RevokeManagerModal({
  isOpen,
  managerToRevoke,
  otherManagers,
  stats,
  repsCount,
  onClose,
  onSuccess
}: {
  isOpen: boolean
  managerToRevoke: OrgManager | null
  otherManagers: OrgManager[]
  stats?: OrgManagerStats['stats']
  repsCount: number
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  const [successorUid, setSuccessorUid] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Pré-sélectionner le premier autre TM disponible par défaut
  useEffect(() => {
    if (otherManagers.length > 0) {
      setSuccessorUid(otherManagers[0]!.uid)
    } else if (user?.uid) {
      setSuccessorUid(user.uid)
    }
  }, [otherManagers, user?.uid])

  if (!isOpen || !managerToRevoke) return null

  const handleRevoke = async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/managers/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetManagerUid: managerToRevoke.uid,
          successorManagerUid: successorUid || undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la révocation')

      pushToast({
        type: 'success',
        title: t('team.orgGovernance.revokeTmTitle'),
        description: t('team.orgGovernance.revokeTmSuccess')
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--card, #121826)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: 'var(--foreground)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {t('team.orgGovernance.revokeTmConfirm')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>
                {managerToRevoke.name || managerToRevoke.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur de successeur */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {t('team.orgGovernance.successorSelect')} <span style={{ color: '#ef4444' }}>*</span>
          </label>

          {otherManagers.length > 0 ? (
            <select
              value={successorUid}
              onChange={(e) => setSuccessorUid(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: 13,
                outline: 'none'
              }}
            >
              {otherManagers.map((tm) => (
                <option key={tm.uid} value={tm.uid}>
                  {tm.name || tm.email} (Team Manager{tm.segment ? ` — ${tm.segment}` : ''})
                </option>
              ))}
              {user && (
                <option value={user.uid}>
                  {user.name || user.email || 'Senior Manager'} (Moi-même — Rapatriement par intérim)
                </option>
              )}
            </select>
          ) : (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontSize: 12.5,
                color: 'var(--foreground)'
              }}
            >
              Aucun autre Team Manager dans l'organisation. L'ensemble des dossiers et commerciaux sera <strong>automatiquement rapatrié sous votre supervision directe (Senior Manager)</strong>.
            </div>
          )}
        </div>

        {/* Résumé du portefeuille transféré */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'var(--background)',
            border: '1px solid var(--border)',
            fontSize: 12.5,
            marginBottom: 20
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--muted-foreground)' }}>
            Éléments transférés automatiquement :
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>
              <strong>{stats?.total ?? 0} opportunité(s) de pipeline</strong> (Prospection : {stats?.prospection ?? 0}, Négociation : {stats?.negociation ?? 0}, Conclues : {stats?.conclue ?? 0})
            </li>
            <li>
              <strong>{repsCount} commercial(aux) terrain rattaché(s)</strong>
            </li>
            <li>
              L'ensemble des prospects importés non encore traités
            </li>
          </ul>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleRevoke}
            disabled={loading || (!successorUid && otherManagers.length > 0)}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="animate-spin" /> Passation en cours...
              </span>
            ) : (
              t('team.orgGovernance.revokeTmConfirm')
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modale de Transfert d'un Commercial entre Team Managers.
 * 100% Opaque conforme à la règle 8 d'AGENTS.md.
 */
function TransferMemberModal({
  isOpen,
  rep,
  currentManager,
  availableManagers,
  onClose,
  onSuccess
}: {
  isOpen: boolean
  rep: TeamMemberRecord | null
  currentManager: OrgManager | null
  availableManagers: OrgManager[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  const [targetManagerUid, setTargetManagerUid] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (availableManagers.length > 0) {
      setTargetManagerUid(availableManagers[0]!.uid)
    }
  }, [availableManagers])

  if (!isOpen || !rep || !currentManager) return null

  const repName = `${rep.firstname || ''} ${rep.lastname || ''}`.trim() || rep.email || 'Commercial'

  const handleTransfer = async () => {
    if (!user || !targetManagerUid) return
    const memberUid = rep.firebaseUid || rep.id
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/members/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          memberUid,
          targetManagerUid
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur lors du transfert du commercial')

      pushToast({
        type: 'success',
        title: t('team.orgGovernance.transferRepTitle'),
        description: t('team.orgGovernance.transferRepSuccess')
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--card, #121826)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: 'var(--foreground)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary, #6366f1)',
                flexShrink: 0
              }}
            >
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {t('team.orgGovernance.transferRepTitle')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>
                {repName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 14 }}>
          Actuellement rattaché à : <strong>{currentManager.name || currentManager.email}</strong>.
        </div>

        {/* Sélecteur du nouveau manager */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {t('team.orgGovernance.targetTmSelect')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            value={targetManagerUid}
            onChange={(e) => setTargetManagerUid(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              height: 38,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: 13,
              outline: 'none'
            }}
          >
            {availableManagers.map((tm) => (
              <option key={tm.uid} value={tm.uid}>
                {tm.name || tm.email} ({tm.isSenior ? 'Senior Manager' : 'Team Manager'}{tm.segment ? ` — ${tm.segment}` : ''})
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--background)',
            border: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--muted-foreground)',
            marginBottom: 20
          }}
        >
          Le commercial conservera son compte et l'ensemble de ses opportunités de prospection en cours. La supervision managériale basculera vers le nouveau Team Manager.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleTransfer}
            disabled={loading || !targetManagerUid}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="animate-spin" /> Transfert...
              </span>
            ) : (
              'Confirmer le transfert'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Modale formelle de demande de révocation d'un Senior Manager au Support */
interface RequestSmRevocationModalProps {
  isOpen: boolean
  manager: OrgManager | null
  availableSuccessors: OrgManager[]
  onClose: () => void
  onSuccess: () => void
}

function RequestSmRevocationModal({
  isOpen,
  manager,
  availableSuccessors,
  onClose,
  onSuccess
}: RequestSmRevocationModalProps) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  const [reason, setReason] = useState('')
  const [executiveContactName, setExecutiveContactName] = useState('')
  const [executiveContactEmail, setExecutiveContactEmail] = useState('')
  const [executiveContactPhone, setExecutiveContactPhone] = useState('')
  const [proposedSuccessorUid, setProposedSuccessorUid] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !manager) return null

  const targetName = manager.name || manager.email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (reason.trim().length < 10) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: t('team.orgGovernance.smRevocationReasonTooShort')
      })
      return
    }

    if (!executiveContactName.trim() || !executiveContactEmail.trim() || !executiveContactEmail.includes('@')) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: t('team.orgGovernance.smRevocationExecContactRequired')
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/support/sm-revocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetSmUid: manager.uid,
          reason: reason.trim(),
          executiveContactName: executiveContactName.trim(),
          executiveContactEmail: executiveContactEmail.trim(),
          executiveContactPhone: executiveContactPhone.trim() || undefined,
          proposedSuccessorUid: proposedSuccessorUid || undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la soumission')

      pushToast({
        type: 'success',
        title: t('team.orgGovernance.smRevocationSuccessTitle'),
        description: data.message || t('team.orgGovernance.smRevocationSuccessDesc')
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--card, #121826)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: 'var(--foreground)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {t('team.orgGovernance.smRevocationModalTitle')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>
                {targetName} ({manager.segment || 'Segment Général'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Notice de gouvernance formelle */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            marginBottom: 16,
            fontSize: 12,
            color: 'var(--foreground)',
            lineHeight: 1.5,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start'
          }}
        >
          <ShieldAlert size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div>{t('team.orgGovernance.smRevocationPolicyNotice')}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Motif officiel */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {t('team.orgGovernance.smRevocationReasonLabel')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('team.orgGovernance.smRevocationReasonPlaceholder')}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: 13,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Section Direction Générale / Mandataire Social */}
          <div
            style={{
              padding: '14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
              {t('team.orgGovernance.smRevocationExecTitle')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                  {t('team.orgGovernance.smRevocationExecName')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={executiveContactName}
                  onChange={(e) => setExecutiveContactName(e.target.value)}
                  placeholder="ex: Jean Dupont (DG)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: 12.5,
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                  {t('team.orgGovernance.smRevocationExecEmail')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={executiveContactEmail}
                  onChange={(e) => setExecutiveContactEmail(e.target.value)}
                  placeholder="dg@entreprise.cm"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: 12.5,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                {t('team.orgGovernance.smRevocationExecPhone')}
              </label>
              <input
                type="tel"
                value={executiveContactPhone}
                onChange={(e) => setExecutiveContactPhone(e.target.value)}
                placeholder="+237 6..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: 12.5,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Repreneur proposé par intérim */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {t('team.orgGovernance.smRevocationSuccessorLabel')}
            </label>
            <select
              value={proposedSuccessorUid}
              onChange={(e) => setProposedSuccessorUid(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: 13,
                outline: 'none'
              }}
            >
              <option value="">{t('team.orgGovernance.smRevocationSuccessorPlaceholder')}</option>
              {availableSuccessors.map((tm) => (
                <option key={tm.uid} value={tm.uid}>
                  {tm.name || tm.email} ({tm.isSenior ? 'Senior Manager' : 'Team Manager'}{tm.segment ? ` — ${tm.segment}` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || !reason.trim() || !executiveContactName.trim() || !executiveContactEmail.trim()}
              style={{
                background: '#d97706',
                borderColor: '#d97706',
                color: '#ffffff'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={14} className="animate-spin" /> {t('team.orgGovernance.smRevocationSubmitting')}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} /> {t('team.orgGovernance.smRevocationSubmitBtn')}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Carte d'un manager avec vue pipeline et liste des commerciaux supervisés */
function ManagerCard({
  manager,
  orgStats,
  supervisedReps,
  availableTransferManagers,
  onRevoke,
  onRequestSmRevocation,
  onTransferRep
}: {
  manager: OrgManager
  orgStats?: OrgManagerStats
  supervisedReps: TeamMemberRecord[]
  availableTransferManagers: OrgManager[]
  onRevoke: (mgr: OrgManager) => void
  onRequestSmRevocation: (mgr: OrgManager) => void
  onTransferRep: (rep: TeamMemberRecord, currentMgr: OrgManager) => void
}) {
  const { t, lang } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: manager.isCurrent
          ? '1px solid var(--primary, #6366f1)'
          : '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s'
      }}
    >
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left'
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: manager.isSenior ? 'var(--primary, #6366f1)' : 'var(--secondary, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {manager.isSenior ? (
            <Crown size={18} color="#fff" />
          ) : (
            <User2 size={18} color="var(--muted-foreground)" />
          )}
        </div>

        {/* Infos principales */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--foreground)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {manager.name || manager.email}
            </span>
            {manager.isSenior && <Badge variant="info">Senior Manager</Badge>}
            {!manager.isSenior && <Badge variant="default">Team Manager</Badge>}
            {manager.segment && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--primary, #6366f1)'
                }}
              >
                <Tag size={11} style={{ marginRight: 2, flexShrink: 0 }} />
                {manager.segment}
              </span>
            )}
            {manager.isCurrent && (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                ({t('common.you')})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
            {manager.email}
          </div>
        </div>

        {/* Compteur total pipeline */}
        {orgStats && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#a78bfa',
                fontFamily: "'Syne',sans-serif"
              }}
            >
              {orgStats.stats.total}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{t('pipeline.opportunities')}</div>
          </div>
        )}

        {/* Bouton Révoquer si c'est un Team Manager sous supervision */}
        {!manager.isSenior && !manager.isCurrent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRevoke(manager)
            }}
            title={t('team.orgGovernance.revokeTmTitle')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 9px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 4
            }}
          >
            <UserMinus size={13} />
            <span className="hidden sm:inline">{t('team.orgGovernance.revokeTmBtn')}</span>
          </button>
        )}

        {/* Bouton Demande au Support si c'est un autre Senior Manager */}
        {manager.isSenior && !manager.isCurrent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRequestSmRevocation(manager)
            }}
            title={t('team.orgGovernance.requestSmRevocationTitle')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 9px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#d97706',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 4
            }}
          >
            <ShieldAlert size={13} />
            <span className="hidden sm:inline">{t('team.orgGovernance.requestSmRevocationBtn')}</span>
          </button>
        )}

        {/* Chevron */}
        <div style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Détails expandus */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Contact */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--muted-foreground)'
              }}
            >
              <Mail size={13} />
              <span>{manager.email}</span>
            </div>
            {manager.phone && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--muted-foreground)'
                }}
              >
                <Phone size={13} />
                <span>{manager.phone}</span>
              </div>
            )}
            {manager.createdAt && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--muted-foreground)'
                }}
              >
                <Calendar size={13} />
                <span>
                  {t('team.orgGovernance.sinceDate', {
                    date: new Date(manager.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Stats pipeline */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8
              }}
            >
              {t('team.orgGovernance.managerPipeline')}
            </div>
            <ManagerStatsRow manager={manager} stats={orgStats?.stats} />
          </div>

          {/* Commerciaux supervisés sous ce manager */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>
                {t('team.orgGovernance.repsSupervised')} ({supervisedReps.length})
              </span>
            </div>

            {supervisedReps.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  fontStyle: 'italic',
                  padding: '8px 12px',
                  background: 'var(--background)',
                  borderRadius: 8
                }}
              >
                {t('team.orgGovernance.noRepsUnderTm')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {supervisedReps.map((rep) => {
                  const repName =
                    `${rep.firstname || ''} ${rep.lastname || ''}`.trim() || rep.email || 'Commercial'
                  return (
                    <div
                      key={rep.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--background)',
                        borderRadius: 8,
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <User2 size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{repName}</span>
                          {rep.email && rep.email !== repName && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 6 }}>
                              ({rep.email})
                            </span>
                          )}
                        </div>
                        {rep.status === 'active' || rep.activated ? (
                          <Badge variant="success">Actif</Badge>
                        ) : (
                          <Badge variant="warning">Invité</Badge>
                        )}
                      </div>

                      {/* Bouton de transfert de commercial */}
                      {availableTransferManagers.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onTransferRep(rep, manager)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--foreground)',
                            cursor: 'pointer'
                          }}
                          title={t('team.orgGovernance.transferRepTitle')}
                        >
                          <ArrowRightLeft size={11} style={{ color: 'var(--primary, #6366f1)' }} />
                          <span>{t('team.orgGovernance.transferRepBtn')}</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Section affichée dans la page Équipe pour le Senior Manager.
 * Liste tous les managers de l'organisation avec leurs stats pipeline,
 * et permet la passation/révocation et le transfert de commerciaux.
 */
export function OrgManagersSection({ managers, orgCode, onRefresh }: OrgManagersSectionProps) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const orgPipelineQuery = useOrgPipeline()

  // État des commerciaux de l'organisation
  const [members, setMembers] = useState<TeamMemberRecord[]>([])

  // Modal states
  const [managerToRevoke, setManagerToRevoke] = useState<OrgManager | null>(null)
  const [smToRevokeRequest, setSmToRevokeRequest] = useState<OrgManager | null>(null)
  const [transferringRep, setTransferringRep] = useState<{
    rep: TeamMemberRecord
    manager: OrgManager
  } | null>(null)

  const loadMembers = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/members?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setMembers(data)
        }
      }
    } catch {
      // Ignorer
    }
  }, [user])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  if (!managers || managers.length === 0) return null

  // Construire un index uid → OrgManagerStats depuis l'org pipeline
  const statsByUid: Record<string, OrgManagerStats> = {}
  if (orgPipelineQuery.data?.managers) {
    for (const mgr of orgPipelineQuery.data.managers) {
      statsByUid[mgr.uid] = mgr
    }
  }

  // Grouper les membres par managerUid
  const membersByManagerUid: Record<string, TeamMemberRecord[]> = {}
  for (const m of members) {
    const mUid = m.managerUid || ''
    if (mUid) {
      if (!membersByManagerUid[mUid]) membersByManagerUid[mUid] = []
      membersByManagerUid[mUid].push(m)
    }
  }

  const teamManagers = managers.filter((m) => !m.isSenior)
  const otherSeniorManagers = managers.filter((m) => m.isSenior && !m.isCurrent)
  const orgCounts = orgPipelineQuery.data?.counts

  const handleActionSuccess = () => {
    void loadMembers()
    if (onRefresh) onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI résumé */}
      {orgCounts && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            padding: '14px 16px',
            background: 'var(--card, #131c2e)',
            border: '1px solid var(--border)',
            borderRadius: 12
          }}
        >
          {[
            {
              label: t('team.orgGovernance.teamManagers'),
              value: teamManagers.length,
              color: '#a78bfa',
              icon: <Users2 size={14} />
            },
            {
              label: t('pipeline.prospection'),
              value: orgCounts.prospection,
              color: '#60a5fa',
              icon: <TrendingUp size={14} />
            },
            {
              label: t('pipeline.negotiation'),
              value: orgCounts.negociation,
              color: '#fbbf24',
              icon: <Filter size={14} />
            },
            {
              label: t('pipeline.concluded'),
              value: orgCounts.conclue,
              color: '#34d399',
              icon: <CheckCircle2 size={14} />
            }
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}
              >
                {value}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--muted-foreground)',
                  marginTop: 2
                }}
              >
                {icon} {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Autres Senior Managers de l'organisation */}
      {otherSeniorManagers.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Crown size={12} style={{ color: '#fbbf24' }} /> Autres Senior Managers ({otherSeniorManagers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherSeniorManagers.map((mgr) => {
              const reps = membersByManagerUid[mgr.uid] || []
              const otherManagers = managers.filter((m) => m.uid !== mgr.uid)
              return (
                <ManagerCard
                  key={mgr.uid}
                  manager={mgr}
                  orgStats={statsByUid[mgr.uid]}
                  supervisedReps={reps}
                  availableTransferManagers={otherManagers}
                  onRevoke={(m) => setManagerToRevoke(m)}
                  onRequestSmRevocation={(m) => setSmToRevokeRequest(m)}
                  onTransferRep={(rep, currentMgr) => setTransferringRep({ rep, manager: currentMgr })}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Team Managers uniquement */}
      {teamManagers.length > 0 ? (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Users2 size={12} /> {t('team.orgGovernance.teamManagersSupervised', { count: teamManagers.length })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamManagers.map((mgr) => {
              const reps = membersByManagerUid[mgr.uid] || []
              const otherManagers = managers.filter((m) => m.uid !== mgr.uid)
              return (
                <ManagerCard
                  key={mgr.uid}
                  manager={mgr}
                  orgStats={statsByUid[mgr.uid]}
                  supervisedReps={reps}
                  availableTransferManagers={otherManagers}
                  onRevoke={(m) => setManagerToRevoke(m)}
                  onRequestSmRevocation={(m) => setSmToRevokeRequest(m)}
                  onTransferRep={(rep, currentMgr) => setTransferringRep({ rep, manager: currentMgr })}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          illustration="/illustrations/empty-states/empty-team.png"
          illustrationSize="sm"
          title={t('team.orgGovernance.emptyManagersTitle')}
          description={t('team.orgGovernance.emptyManagersDesc')}
        />
      )}

      {/* Modale de passation de service & révocation */}
      <RevokeManagerModal
        isOpen={managerToRevoke !== null}
        managerToRevoke={managerToRevoke}
        otherManagers={teamManagers.filter((m) => m.uid !== managerToRevoke?.uid)}
        stats={managerToRevoke ? statsByUid[managerToRevoke.uid]?.stats : undefined}
        repsCount={managerToRevoke ? (membersByManagerUid[managerToRevoke.uid]?.length ?? 0) : 0}
        onClose={() => setManagerToRevoke(null)}
        onSuccess={handleActionSuccess}
      />

      {/* Modale de demande formelle de révocation d'un Senior Manager au Support */}
      <RequestSmRevocationModal
        isOpen={smToRevokeRequest !== null}
        manager={smToRevokeRequest}
        availableSuccessors={managers.filter((m) => m.uid !== smToRevokeRequest?.uid)}
        onClose={() => setSmToRevokeRequest(null)}
        onSuccess={handleActionSuccess}
      />

      {/* Modale de transfert d'un commercial */}
      <TransferMemberModal
        isOpen={transferringRep !== null}
        rep={transferringRep?.rep ?? null}
        currentManager={transferringRep?.manager ?? null}
        availableManagers={managers.filter((m) => m.uid !== transferringRep?.manager.uid)}
        onClose={() => setTransferringRep(null)}
        onSuccess={handleActionSuccess}
      />
    </div>
  )
}
