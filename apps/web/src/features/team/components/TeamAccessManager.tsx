import { useState, useEffect } from 'react'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState, LoadingState } from '@/components/feedback/index'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Trash2,
  Copy,
  Ban,
  ChevronDown,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Shield,
  Fingerprint,
  Clock,
  XCircle,
  ArrowRight,
  UserCheck,
  Mail
} from 'lucide-react'

function normalizeText(text: string) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function buildAccessId(firstname: string, lastname: string, company: string) {
  const first = normalizeText(firstname)
  const last = normalizeText(lastname)
  const comp = normalizeText(company)
  if (!first && !last && !comp) return '@entreprise'
  return `${first}${last}@${comp}`
}

export function TeamAccessManager() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const { t } = useTranslation()

  const [accesses, setAccesses] = useState<any[]>([])
  const [loadingAccesses, setLoadingAccesses] = useState(false)
  const [formData, setFormData] = useState({ firstname: '', lastname: '', company: '', email: '' })
  const [permissions, setPermissions] = useState({ canExport: false, canDelete: false, canAssign: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const previewId = buildAccessId(
    formData.firstname,
    formData.lastname,
    formData.company || user?.companyName || 'Entreprise'
  )

  const currentPlan = user?.plan || 'free'
  const maxMembers = currentPlan === 'enterprise' ? 10 : currentPlan === 'pro' ? 3 : 0
  const activeOrPendingCount = accesses.filter(
    (acc) => acc.status === 'pending' || acc.status === 'active'
  ).length

  useEffect(() => {
    if (!user || user.role !== 'manager') return

    setLoadingAccesses(true)

    // Set up real-time listener for team accesses
    const q = query(collection(db, 'team_accesses'), where('managerUid', '==', user.uid))

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAccesses(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
        )
        setLoadingAccesses(false)
      },
      (error: any) => {
        pushToast({ type: 'error', title: `Erreur: ${error.message}` })
        setLoadingAccesses(false)
      }
    )

    // Clean up listener on unmount
    return () => unsubscribe()
  }, [user, pushToast])

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (activeOrPendingCount >= maxMembers) {
      pushToast({
        type: 'error',
        title: `Limite atteinte: Le plan ${currentPlan.toUpperCase()} ne permet que ${maxMembers} membres.`
      })
      return
    }

    setIsSubmitting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/accesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstname: formData.firstname,
          lastname: formData.lastname,
          company: formData.company || user.companyName || 'Entreprise',
          email: formData.email,
          permissions
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Erreur lors de la création')

      if (data.emailStatus === 'simulated') {
        pushToast({ type: 'warning', title: `Accès créé, mais e-mail simulé (Clé API Brevo manquante sur Vercel ?)` })
      } else if (data.emailStatus === 'failed') {
        pushToast({ type: 'error', title: `Accès créé, mais échec d'envoi de l'e-mail. Erreur: ${data.emailError}` })
      } else if (data.emailStatus === 'sent') {
        pushToast({ type: 'success', title: `Accès créé ! E-mail d'activation envoyé avec succès.` })
      } else {
        pushToast({ type: 'success', title: `Accès créé ! Lien généré (sans envoi d'e-mail).` })
      }
      setFormData({ firstname: '', lastname: '', company: '', email: '' })
      setPermissions({ canExport: false, canDelete: false, canAssign: false })
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLink = async (magicCode: string) => {
    const link = `${window.location.origin}/activate?code=${magicCode}`
    await navigator.clipboard.writeText(link)
    pushToast({ type: 'info', title: `Lien magique copié !` })
  }

  const copyId = async (id: string) => {
    const lowerId = id.toLowerCase()
    await navigator.clipboard.writeText(lowerId)
    pushToast({ type: 'info', title: `ID copié: ${lowerId}` })
  }

  const revokeAccess = async (id: string) => {
    if (!user) return
    if (!confirm(t('support.confirmDelete') || 'Voulez-vous révoquer cet accès ?')) return
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/accesses/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ accessId: id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la révocation')

      pushToast({ type: 'success', title: 'Accès révoqué et membre détaché' })
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    }
  }

  const deleteMember = async (accessId: string) => {
    if (!user) return
    setDeletingId(accessId)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/team/members/${encodeURIComponent(accessId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as any).message ?? `Erreur ${res.status}`)
      pushToast({
        type: 'success',
        title: `Membre supprimé (${json.pipelineDeleted ?? 0} items pipeline retirés)`
      })
      setConfirmDeleteId(null)
      // Real-time listener updates the list automatically
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur suppression: ${e.message}` })
    } finally {
      setDeletingId(null)
    }
  }

  if (user?.role !== 'manager') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `
        }}
      />
      <DataCard title={t('team.createAccess')} subtitle={t('team.createAccessDesc')}>
        <form
          onSubmit={handleCreateAccess}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.textMid,
                  textTransform: 'uppercase',
                  paddingLeft: 4
                }}
              >
                {t('team.firstname')}
              </label>
              <Input
                placeholder="Ex: Jean"
                value={formData.firstname}
                onChange={(e) => setFormData((p) => ({ ...p, firstname: e.target.value }))}
                required
                style={{ borderRadius: 10, padding: '12px 14px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.textMid,
                  textTransform: 'uppercase',
                  paddingLeft: 4
                }}
              >
                {t('team.lastname')}
              </label>
              <Input
                placeholder="Ex: Dupont"
                value={formData.lastname}
                onChange={(e) => setFormData((p) => ({ ...p, lastname: e.target.value }))}
                required
                style={{ borderRadius: 10, padding: '12px 14px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.textMid,
                  textTransform: 'uppercase',
                  paddingLeft: 4
                }}
              >
                {t('team.companyOptional')}
              </label>
              <Input
                placeholder={user?.companyName || 'Entreprise'}
                value={formData.company}
                onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                style={{ borderRadius: 10, padding: '12px 14px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.textMid,
                  textTransform: 'uppercase',
                  paddingLeft: 4
                }}
              >
                Email (Envoi lien direct)
              </label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                style={{ borderRadius: 10, padding: '12px 14px' }}
              />
            </div>
          </div>

          {/* Permissions Toggles */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors.border}` }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
               <input 
                 type="checkbox" 
                 checked={permissions.canExport} 
                 onChange={(e) => setPermissions(p => ({ ...p, canExport: e.target.checked }))} 
                 style={{ accentColor: '#6366f1', width: 16, height: 16 }}
               />
               Peut exporter les données
             </label>
             <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
               <input 
                 type="checkbox" 
                 checked={permissions.canDelete} 
                 onChange={(e) => setPermissions(p => ({ ...p, canDelete: e.target.checked }))} 
                 style={{ accentColor: '#6366f1', width: 16, height: 16 }}
               />
               Peut supprimer des prospects
             </label>
             <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
               <input 
                 type="checkbox" 
                 checked={permissions.canAssign} 
                 onChange={(e) => setPermissions(p => ({ ...p, canAssign: e.target.checked }))} 
                 style={{ accentColor: '#6366f1', width: 16, height: 16 }}
               />
               Peut réassigner des prospects
             </label>
          </div>

          {/* Quota Collaborateurs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '16px 20px',
              borderRadius: 12,
              background: activeOrPendingCount >= maxMembers ? 'rgba(239,68,68,0.04)' : 'rgba(99,102,241,0.04)',
              border: `1px solid ${activeOrPendingCount >= maxMembers ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}`,
              transition: 'all 200ms ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                {t('team.quotaLabel') || 'Quota de collaborateurs :'}
                <span
                  style={{
                    marginLeft: 6,
                    color: activeOrPendingCount >= maxMembers ? '#ef4444' : colors.green,
                    fontWeight: 800
                  }}
                >
                  {activeOrPendingCount}
                </span>{' '}
                <span style={{ color: colors.textDim, fontWeight: 400 }}>/ {maxMembers}</span>
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: colors.textMid }}>
                  ({currentPlan.toUpperCase()})
                </span>
              </span>
              {activeOrPendingCount >= maxMembers && (
                <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 700 }}>
                  {t('team.quotaReached') || 'Limite atteinte. Passez au plan supérieur pour ajouter plus de membres.'}
                </span>
              )}
            </div>
            
            <div
              style={{
                height: 6,
                width: '100%',
                background: colors.bg2,
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${colors.border}`
              }}
            >
              <div
                style={{
                  width: `${Math.min((activeOrPendingCount / (maxMembers || 1)) * 100, 100)}%`,
                  height: '100%',
                  background: activeOrPendingCount >= maxMembers ? '#ef4444' : colors.green,
                  borderRadius: 10,
                  transition: 'width 400ms ease-out'
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              background: colors.bg2,
              padding: '16px 20px',
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.green,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Fingerprint size={20} />
              </div>
              <div>
                <span
                  style={{ fontSize: 11, color: colors.textMid, fontWeight: 600, display: 'block' }}
                >
                  {t('team.accessIdPreview')}
                </span>
                <strong
                  style={{
                    fontSize: 16,
                    color: colors.green,
                    fontFamily: 'monospace',
                    letterSpacing: '0.02em'
                  }}
                >
                  {previewId}
                </strong>
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || previewId === '@entreprise' || activeOrPendingCount >= maxMembers}
              style={{ borderRadius: 10, padding: '10px 24px', fontWeight: 800 }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" style={{ marginRight: 8 }} />
                  {t('team.creating')}
                </>
              ) : (
                <>
                  <UserPlus size={16} style={{ marginRight: 8 }} />
                  {t('team.generateAccess')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DataCard>

      <DataCard
        title={t('team.generatedAccesses')}
        subtitle={`${accesses.length} ${t('team.totalAccesses')}`}
      >
        {loadingAccesses ? (
          <LoadingState />
        ) : accesses.length === 0 ? (
          <EmptyState title={t('team.noAccess')} description={t('team.noAccessDesc')} icon="🔑" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accesses.map((acc) => {
              const isActivated = acc.activated === true
              const isRevoked = acc.status === 'revoked'
              const isPendingEmail = acc.status === 'pending_email'
              const displayStatus = isRevoked
                ? 'revoked'
                : isActivated
                  ? 'active'
                  : isPendingEmail
                    ? 'pending_email'
                    : 'pending'
              const isConfirmingDelete = confirmDeleteId === acc.id
              const isDeleting = deletingId === acc.id

              return (
                <div
                  key={acc.id}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    background: colors.surface,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'all 200ms ease'
                  }}
                >
                  {/* Main row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      opacity: isRevoked ? 0.6 : 1,
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flex: 1,
                        minWidth: 200
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: isRevoked
                            ? colors.bg3
                            : isActivated
                              ? 'rgba(34,197,94,0.1)'
                              : 'rgba(99,102,241,0.1)',
                          color: isRevoked ? colors.textDim : isActivated ? '#16a34a' : '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isActivated ? <UserCheck size={20} /> : <Clock size={20} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 2,
                            flexWrap: 'wrap'
                          }}
                        >
                          <strong style={{ fontSize: 14, fontWeight: 800 }}>
                            {acc.firstname} {acc.lastname}
                          </strong>
                          <Badge
                            variant={
                              displayStatus === 'active'
                                ? 'success'
                                : displayStatus === 'revoked'
                                  ? 'danger'
                                  : 'default'
                            }
                            style={{ fontSize: 9, padding: '1px 6px' }}
                          >
                            {displayStatus === 'active'
                              ? t('team.active')
                              : displayStatus === 'revoked'
                                ? t('team.revoked')
                                : displayStatus === 'pending_email'
                                  ? t('team.pendingEmail')
                                  : t('team.pending')}
                          </Badge>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: colors.textMid,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            textTransform: 'lowercase'
                          }}
                        >
                          {acc.accessId}
                        </div>
                        {acc.email && (
                          <div
                            style={{
                              fontSize: 11,
                              color: colors.textDim,
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Mail size={10} /> {acc.email}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {/* Copy Link / ID — only for pending */}
                      {displayStatus === 'pending' || displayStatus === 'pending_email' ? (
                        <>
                          {acc.magicCode ? (
                            <button
                              title="Copier le lien magique d'activation"
                              onClick={() => copyLink(acc.magicCode)}
                              style={{ ...btnStyle('#10b981'), fontWeight: 700 }}
                            >
                              <Copy size={13} /> Lien d'accès
                            </button>
                          ) : (
                            <button
                              title={t('team.copyAccessId')}
                              onClick={() => copyId(acc.accessId)}
                              style={btnStyle('#6366f1')}
                            >
                              <Copy size={13} /> {t('team.copy')} ID
                            </button>
                          )}
                        </>
                      ) : null}
                      {/* Revoke — only for non-revoked */}
                      {displayStatus !== 'revoked' && (
                        <button
                          title={t('team.revokeAccess')}
                          onClick={() => revokeAccess(acc.id)}
                          style={btnStyle('#f59e0b')}
                        >
                          <Ban size={13} /> {t('team.revoke')}
                        </button>
                      )}
                      {/* Delete — always available */}
                      <button
                        title={t('team.deletePermanently')}
                        onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : acc.id)}
                        style={{
                          ...btnStyle('#ef4444'),
                          background: isConfirmingDelete ? 'rgba(239,68,68,0.1)' : 'transparent'
                        }}
                      >
                        <Trash2 size={13} /> {t('team.delete')}
                        <ChevronDown
                          size={11}
                          style={{
                            marginLeft: 2,
                            transform: isConfirmingDelete ? 'rotate(180deg)' : 'none',
                            transition: 'transform 200ms'
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation panel — slides in below the row */}
                  {isConfirmingDelete && (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(239,68,68,0.06)',
                        borderTop: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        animation: 'slideDown 150ms ease'
                      }}
                    >
                      <div style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.5 }}>
                        <strong>{t('team.deletePermanently')}</strong> {acc.firstname}{' '}
                        {acc.lastname} ?<br />
                        <span style={{ fontSize: 11.5, opacity: 0.8 }}>
                          {t('team.deleteWarning')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={btnStyle(colors.textMid)}
                        >
                          {t('team.cancel')}
                        </button>
                        <button
                          onClick={() => void deleteMember(acc.id)}
                          disabled={isDeleting}
                          style={{
                            ...btnStyle('#EF4444'),
                            background: 'rgba(239,68,68,0.12)',
                            fontWeight: 700
                          }}
                        >
                          <Trash2 size={13} />
                          {isDeleting ? t('team.deleting') : t('team.confirmDeleteBtn')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DataCard>
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
    padding: '0 10px',
    borderRadius: 7,
    border: `1px solid ${color}22`,
    background: `${color}11`,
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap'
  }
}
