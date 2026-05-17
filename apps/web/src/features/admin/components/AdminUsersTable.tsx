import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors, shadows } from '@/styles/tokens'
import type { UserDoc, UserPlan } from '@sales-companion/shared'
import { PLAN_LIMITS } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'
import { 
  User, Mail, Building2, Shield, Zap, 
  BarChart3, Trash2, Settings, RefreshCw, 
  MapPin, Activity, Calendar, Clock
} from 'lucide-react'

type UserWithId = UserDoc & {
  id?: string
  company?: string | null
  sector?: string | null
  region?: string | null
  phone?: string | null
  createdAt?: string | null
  lastLoginAt?: string | null
  managerId?: string | null
}

type Props = {
  users: UserWithId[]
  onDelete: (uid: string) => void
  onUpdate?: (uid: string, data: Record<string, unknown>) => void
}

const roleBadge: Record<string, 'success' | 'gold' | 'info' | 'default'> = {
  admin:       'gold',
  manager:     'success',
  member:      'info',
  independent: 'default',
}

const planBadge: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free:       'default',
  starter:    'info',
  pro:        'success',
  enterprise: 'gold',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

export function AdminUsersTable({ users, onDelete, onUpdate }: Props) {
  const { t } = useTranslation()

  if (!users.length) {
    return <p style={{ color: colors.textMid, textAlign: 'center', padding: '32px 0' }}>{t('team.noUserMatch') || 'Aucun utilisateur.'}</p>
  }

  const headers = [
    { label: t('admin.user') || 'Utilisateur', icon: <User size={12} /> },
    { label: t('admin.role'), icon: <Shield size={12} /> },
    { label: t('admin.plan'), icon: <Zap size={12} /> },
    { label: t('admin.quota'), icon: <BarChart3 size={12} /> },
    { label: t('admin.status'), icon: <Activity size={12} /> },
    { label: `${t('field.region') || 'Région'} / ${t('field.sector') || 'Secteur'}`, icon: <MapPin size={12} /> },
    { label: t('admin.created'), icon: <Calendar size={12} /> },
    { label: t('admin.lastLogin') || 'Dernière co.', icon: <Clock size={12} /> },
    { label: t('admin.actions'), icon: <Settings size={12} /> }
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12.5,
        }}
      >
        <thead>
          <tr style={{ background: colors.bg3 }}>
            {headers.map((h) => (
              <th
                key={h.label}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: colors.textMid,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  borderBottom: `2px solid ${colors.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {h.icon}
                  {h.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.uid}
              style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 150ms ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg3)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Nom & Email */}
              <td style={{ padding: '16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, flexShrink: 0,
                    border: '1px solid rgba(99,102,241,0.2)'
                  }}>
                    {(user.name ?? user.email ?? '?')[0]?.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: colors.text, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name || '—'}
                    </span>
                    <span style={{ fontSize: 11, color: colors.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email || '—'}
                    </span>
                  </div>
                </div>
              </td>
              {/* Rôle */}
              <td style={{ padding: '16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge variant={roleBadge[user.role] ?? 'default'} style={{ fontSize: 10, padding: '2px 8px' }}>
                    {user.role}
                  </Badge>
                </div>
              </td>
              {/* Plan */}
              <td style={{ padding: '11px 12px' }}>
                {onUpdate ? (
                  <select
                    value={user.plan}
                    onChange={(e) => {
                      const newPlan = e.target.value as UserPlan
                      onUpdate(user.uid, { 
                        plan: newPlan, 
                        dailyLimit: PLAN_LIMITS[newPlan] ?? 10 
                      })
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      background: colors.bg2,
                      color: colors.text,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="free">FREE</option>
                    <option value="starter">STARTER</option>
                    <option value="pro">PRO</option>
                    <option value="enterprise">ENTERPRISE</option>
                  </select>
                ) : (
                  <Badge variant={planBadge[user.plan] ?? 'default'}>{user.plan}</Badge>
                )}
              </td>
              {/* Quota */}
              <td style={{ padding: '16px 12px', minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>
                    {user.dailyUsed}
                    <span style={{ color: colors.textDim, fontWeight: 400, marginLeft: 2, fontSize: 11 }}>/</span>
                  </span>
                  {onUpdate ? (
                    <input
                      type="number"
                      value={user.dailyLimit}
                      onChange={(e) => onUpdate(user.uid, { dailyLimit: parseInt(e.target.value) || 0 })}
                      style={{
                        width: 50,
                        padding: '2px 4px',
                        fontSize: 11,
                        background: colors.bg2,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 4,
                        color: colors.text,
                        fontWeight: 700,
                        textAlign: 'right',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMid }}>{user.dailyLimit}</span>
                  )}
                </div>
                <div style={{ height: 6, width: '100%', background: colors.bg2, borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, user.dailyLimit > 0 ? (user.dailyUsed / user.dailyLimit) * 100 : 0)}%`,
                    background: (user.dailyUsed / (user.dailyLimit || 1)) > 0.8 ? '#f87171' : '#6366f1',
                    borderRadius: 10,
                    transition: 'width 500ms ease-out'
                  }} />
                </div>
              </td>
              {/* Statut */}
              <td style={{ padding: '11px 12px' }}>
                <Badge variant={user.active ? 'success' : 'danger'}>
                  {user.active ? t('team.active') : t('team.inactive')}
                </Badge>
              </td>
              {/* Région / Secteur */}
              <td style={{ padding: '11px 12px', color: colors.textMid, fontSize: 12 }}>
                <div>{user.region ?? '—'}</div>
                <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>{user.sector ?? ''}</div>
              </td>
              {/* Créé le */}
              <td style={{ padding: '11px 12px', color: colors.textMid, whiteSpace: 'nowrap', fontSize: 12 }}>
                {formatDate(user.createdAt)}
              </td>
              {/* Dernière connexion */}
              <td style={{ padding: '11px 12px', color: colors.textMid, whiteSpace: 'nowrap', fontSize: 12 }}>
                {formatDate(user.lastLoginAt)}
              </td>
              {/* Actions */}
              <td style={{ padding: '16px 12px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {onUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUpdate(user.uid, { active: !user.active })}
                      style={{ 
                        padding: '6px', 
                        minWidth: 32, 
                        height: 32, 
                        borderRadius: 8,
                        color: user.active ? '#f87171' : '#22c55e'
                      }}
                      title={user.active ? (t('team.deactivate') || 'Désactiver') : (t('team.activate') || 'Activer')}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(user.uid)}
                    style={{ padding: '6px', minWidth: 32, height: 32, borderRadius: 8 }}
                    title={t('team.remove') || 'Supprimer'}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
