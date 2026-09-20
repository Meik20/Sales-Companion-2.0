'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useToast } from '@/hooks/useToast'
import { Panel, Badge, MetricCard, StatsGrid } from '@/components/ui/index'
import { firestore } from '@/services/firebase/client'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { Building2, Briefcase, MapPin, Edit3, Phone, User, Check, X, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react'

const planBadge: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free: 'default',
  starter: 'info',
  pro: 'info',
  enterprise: 'gold'
}

const roleLabelKeys: Record<string, string> = {
  admin: 'profile.roles.admin',
  manager: 'profile.roles.manager',
  member: 'profile.roles.member',
  independent: 'profile.roles.independent',
  support_agent: 'profile.roles.support_agent'
}

const CAMEROON_SECTORS = [
  'Commerce',
  'BTP & Construction',
  'Industrie manufacturière',
  'Agriculture & Agroalimentaire',
  'Services & Conseil',
  'Transport & Logistique',
  'Hôtellerie & Restauration',
  'Santé',
  'Éducation & Formation',
  'Technologies & Numérique',
  'Finance & Assurance',
  'Énergie & Mines'
]

const CAMEROON_REGIONS = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extrême-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest'
]

export function ProfileCard() {
  const { t, lang } = useTranslation()
  const { user, loading } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editTokenParam = searchParams.get('edit_token')

  const [isAuthorizedBySupport, setIsAuthorizedBySupport] = useState(false)
  const [requestingSupport, setRequestingSupport] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    sector: '',
    region: '',
    phone: ''
  })

  // Vérifier si une autorisation est active pour ce compte
  useEffect(() => {
    // 1. Vérification via les métadonnées utilisateur
    const userAuthUntil = (user as any)?.profileEditAuthorizedUntil
    const isDocAuthorized =
      userAuthUntil?.toDate
        ? userAuthUntil.toDate().getTime() > Date.now()
        : false

    if (isDocAuthorized) {
      setIsAuthorizedBySupport(true)
    }

    // 2. Si un edit_token est passé dans l'URL
    if (editTokenParam && user) {
      user.getIdToken().then((idToken) => {
        fetch('/api/profile/verify-edit-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({ token: editTokenParam })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.valid) {
              setIsAuthorizedBySupport(true)
              pushToast({
                type: 'success',
                title: '✅ Autorisation de modification accordée par le support !'
              })
              openEditModal()
            } else if (data.error) {
              pushToast({
                type: 'error',
                title: data.error
              })
            }
          })
          .catch(() => {})
      })
    }
  }, [editTokenParam, user?.uid])

  const handleRequestProfileChange = async () => {
    if (!user) return
    const reason = window.prompt(
      'Précisez brièvement les informations que vous souhaitez modifier (ex: changement de numéro, nouvelle raison sociale, etc.) :'
    )
    if (reason === null) return // Annulé par l'utilisateur

    setRequestingSupport(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/support/profile-change/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du ticket.')
      }

      pushToast({
        type: 'success',
        title: '✅ Demande transmise au support ! Redirection en cours...'
      })

      if (data.threadId) {
        router.push(`${routes.support}?ticket=${encodeURIComponent(data.threadId)}`)
      }
    } catch (err: any) {
      console.error('Request profile change error:', err)
      pushToast({
        type: 'error',
        title: err.message || 'Erreur lors de la demande au support.'
      })
    } finally {
      setRequestingSupport(false)
    }
  }

  const openEditModal = () => {
    if (!user) return
    setFormData({
      name: user.name || '',
      company: user.company || user.companyName || '',
      sector: user.sector || user.industry || '',
      region: user.region || '',
      phone: user.phone || ''
    })
    setIsEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return

    setSaving(true)
    try {
      const userRef = doc(firestore, 'users', user.uid)
      await updateDoc(userRef, {
        name: formData.name.trim(),
        company: formData.company.trim() || null,
        companyName: formData.company.trim() || null,
        sector: formData.sector || null,
        industry: formData.sector || null,
        region: formData.region || null,
        phone: formData.phone.trim() || null,
        updatedAt: serverTimestamp()
      })

      pushToast({
        type: 'success',
        title: t('profile.profileUpdatedToast' as any) || 'Profil mis à jour avec succès !'
      })
      setIsEditing(false)
    } catch (err) {
      console.error('[ProfileCard] Error updating profile:', err)
      pushToast({
        type: 'error',
        title: t('profile.profileUpdateErrorToast' as any) || 'Erreur lors de la mise à jour du profil.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Panel>
        <p style={{ color: 'var(--muted-foreground, #94a3b8)', textAlign: 'center', padding: 32 }}>
          {t('profile.loading')}
        </p>
      </Panel>
    )
  }

  if (!user) return null

  const usagePercent =
    user.dailyLimit > 0 ? Math.round((user.dailyUsed / user.dailyLimit) * 100) : 0

  const usageColor =
    usagePercent > 80 ? '#f87171' : usagePercent > 60 ? '#fbbf24' : 'var(--color-primary)'

  const displayCompany = user.company || user.companyName
  const displaySector = user.sector || user.industry

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card with Company & Sector */}
      <Panel>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
          {/* Avatar */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(55,138,221,0.15)',
              border: '2px solid rgba(55,138,221,0.3)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 26,
              fontWeight: 800,
              fontFamily: 'inherit'
            }}
          >
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>

          {/* Infos */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 6
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'var(--foreground, #f1f5f9)',
                  fontFamily: 'inherit'
                }}
              >
                {user.name || t('profile.defaultName')}
              </h2>
              <Badge variant={planBadge[user.plan] ?? 'default'}>{user.plan?.toUpperCase()}</Badge>
            </div>
            
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>{user.email}</p>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>
              {t(roleLabelKeys[user.role] as any) || user.role}
            </p>

            {/* Badges Entreprise & Secteur d'activité */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {/* Entreprise */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--secondary, #1e2a3b)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--foreground, #f1f5f9)'
                }}
              >
                <Building2 size={15} style={{ color: 'var(--color-primary, #3b82f6)' }} />
                <span>
                  <strong style={{ color: 'var(--muted-foreground, #94a3b8)', fontWeight: 500 }}>
                    {t('profile.companyLabel' as any) || 'Entreprise'} :
                  </strong>{' '}
                  {displayCompany ? (
                    <span style={{ fontWeight: 600 }}>{displayCompany}</span>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic' }}>
                      {t('profile.noCompany' as any) || 'Non renseignée'}
                    </span>
                  )}
                </span>
              </div>

              {/* Secteur d'activité */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--secondary, #1e2a3b)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--foreground, #f1f5f9)'
                }}
              >
                <Briefcase size={15} style={{ color: '#10b981' }} />
                <span>
                  <strong style={{ color: 'var(--muted-foreground, #94a3b8)', fontWeight: 500 }}>
                    {t('profile.sectorLabel' as any) || "Secteur d'activité"} :
                  </strong>{' '}
                  {displaySector ? (
                    <span style={{ fontWeight: 600 }}>{displaySector}</span>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic' }}>
                      {t('profile.noSector' as any) || 'Non renseigné'}
                    </span>
                  )}
                </span>
              </div>

              {/* Région */}
              {user.region && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--secondary, #1e2a3b)',
                    border: '1px solid var(--border, rgba(255,255,255,0.1))',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--foreground, #f1f5f9)'
                  }}
                >
                  <MapPin size={15} style={{ color: '#f59e0b' }} />
                  <span>
                    <strong style={{ color: 'var(--muted-foreground, #94a3b8)', fontWeight: 500 }}>
                      {t('profile.regionLabel' as any) || 'Région'} :
                    </strong>{' '}
                    <span style={{ fontWeight: 600 }}>{user.region}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions selon le rôle */}
          {user.role === 'independent' || user.role === 'admin' ? (
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
            >
              <Edit3 size={14} />
              {t('profile.editProfileBtn' as any) || 'Modifier mes informations'}
            </button>
          ) : user.role === 'manager' ? (
            <div className="flex flex-col items-end gap-1.5">
              {isAuthorizedBySupport ? (
                <>
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <Edit3 size={14} />
                    {t('profile.editProfileBtn' as any) || 'Modifier mes informations'}
                  </button>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Check size={13} />
                    Autorisation active accordée par le support
                  </span>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRequestProfileChange}
                    disabled={requestingSupport}
                    className="flex items-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {requestingSupport ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Envoi au support…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        {t('profile.requestChangeViaSupportBtn' as any) || 'Demander une modification au support'}
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground/70 max-w-[260px] text-right">
                    {t('profile.managerProfileLockedNotice' as any)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-muted-foreground" />
              <span>{t('profile.memberProfileLockedNotice' as any)}</span>
            </div>
          )}
        </div>
      </Panel>

      {/* Modal / Formulaire d'édition du profil */}
      {isEditing && (
        <Panel>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 size={16} className="text-primary" />
                {t('profile.editProfileTitle' as any) || 'Modifier le profil professionnel'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Nom complet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User size={13} /> {t('profile.fullNameLabel' as any) || 'Nom complet'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  required
                />
              </div>

              {/* Nom de l'entreprise */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Building2 size={13} /> {t('profile.companyLabel' as any) || 'Nom de l\'entreprise'}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Ex: BatiCameroun SARL, AgriPlus, etc."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* Secteur d'activité */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Briefcase size={13} /> {t('profile.sectorLabel' as any) || "Secteur d'activité"}
                </label>
                <select
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="">-- {t('profile.noSector' as any) || 'Sélectionner un secteur'} --</option>
                  {CAMEROON_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Région */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin size={13} /> {t('profile.regionLabel' as any) || 'Région principale'}
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="">-- {t('profile.selectRegion' as any) || 'Sélectionner une région'} --</option>
                  {CAMEROON_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Téléphone */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Phone size={13} /> {t('profile.phoneLabel' as any) || 'Numéro de téléphone'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: +237 6XX XX XX XX"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary max-w-md"
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-border bg-transparent px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                {t('profile.cancelBtn' as any) || 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                {saving
                  ? t('profile.loading')
                  : t('profile.saveBtn' as any) || 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Stats — masqués pour l'agent support (pas de quota de recherche) */}
      {user.role !== 'support_agent' ? (
        <>
          <StatsGrid>
            <MetricCard
              label={user.plan === 'free' ? (t('profile.searchesThisMonth' as any) || "Recherches ce mois") : t('profile.searchesToday')}
              value={`${user.dailyUsed} / ${user.dailyLimit}`}
              hint={`${usagePercent}% ${t('profile.quotaUsed')}`}
              accent
            />
            <MetricCard
              label={user.plan === 'free' ? (t('profile.monthlyQuota' as any) || "Quota mensuel") : t('profile.dailyQuota')}
              value={user.dailyLimit}
              hint={user.plan === 'free' ? (t('profile.resetMonthly' as any) || "Réinitialisé chaque mois") : t('profile.resetDaily')}
            />
            <MetricCard
              label={t('profile.status')}
              value={user.active ? `✓ ${t('profile.active')}` : `✗ ${t('profile.inactive')}`}
            />
          </StatsGrid>

          {/* Barre d'utilisation */}
          <Panel>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--muted-foreground, #94a3b8)',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em'
                  }}
                >
                  {user.plan === 'free' ? (t('profile.monthlyQuotaLabel' as any) || "Quota mensuel") : t('profile.dailyQuotaLabel')}
                </span>
                <span style={{ fontSize: 12, color: usageColor, fontWeight: 600 }}>
                  {usagePercent}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--secondary, #1e2a3b)',
                  borderRadius: 999,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${usagePercent}%`,
                    background: usageColor,
                    borderRadius: 999,
                    transition: 'width 600ms ease'
                  }}
                />
              </div>
            </div>
          </Panel>
        </>
      ) : (
        /* Vue agent support : statut uniquement, sans quota */
        <StatsGrid>
          <MetricCard
            label={t('profile.status')}
            value={user.active ? `✓ ${t('profile.active')}` : `✗ ${t('profile.inactive')}`}
          />
          <MetricCard
            label="Quota de recherche"
            value="Illimité"
            hint="Aucun quota appliqué"
            accent
          />
        </StatsGrid>
      )}
    </div>
  )
}
