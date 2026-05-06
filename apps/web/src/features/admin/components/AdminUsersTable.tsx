import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import type { UserDoc } from '@sales-companion/shared'

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
  if (!users.length) {
    return <p style={{ color: colors.textMid, textAlign: 'center', padding: '32px 0' }}>Aucun utilisateur.</p>
  }

  const headers = ['Nom', 'Email', 'Entreprise', 'Rôle', 'Plan', 'Quota', 'Statut', 'Région / Secteur', 'Créé le', 'Dernière co.', 'Actions']

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
                key={h}
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
                {h}
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
              {/* Nom */}
              <td style={{ padding: '11px 12px', color: colors.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: colors.greenLight,
                    color: colors.green,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(user.name ?? user.email ?? '?')[0]?.toUpperCase()}
                  </div>
                  <span>{user.name || '—'}</span>
                </div>
              </td>
              {/* Email */}
              <td style={{ padding: '11px 12px', color: colors.textMid, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email ?? '—'}
              </td>
              {/* Entreprise */}
              <td style={{ padding: '11px 12px', color: colors.textMid, whiteSpace: 'nowrap' }}>
                {user.company ?? '—'}
              </td>
              {/* Rôle */}
              <td style={{ padding: '11px 12px' }}>
                <Badge variant={roleBadge[user.role] ?? 'default'}>{user.role}</Badge>
              </td>
              {/* Plan */}
              <td style={{ padding: '11px 12px' }}>
                {onUpdate ? (
                  <select
                    value={user.plan}
                    onChange={(e) => {
                      const newPlan = e.target.value
                      const limits: Record<string, number> = {
                        free: 10,
                        starter: 50,
                        pro: 200,
                        enterprise: 1000,
                      }
                      onUpdate(user.uid, { 
                        plan: newPlan, 
                        dailyLimit: limits[newPlan] ?? 10 
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
              <td style={{ padding: '11px 12px', color: colors.textMid, whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 12 }}>{user.dailyUsed}/{user.dailyLimit}</div>
                <div style={{ marginTop: 3, height: 4, width: 60, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, user.dailyLimit > 0 ? (user.dailyUsed / user.dailyLimit) * 100 : 0)}%`,
                    background: colors.green, borderRadius: 2,
                  }} />
                </div>
              </td>
              {/* Statut */}
              <td style={{ padding: '11px 12px' }}>
                <Badge variant={user.active ? 'success' : 'danger'}>
                  {user.active ? 'Actif' : 'Inactif'}
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
              <td style={{ padding: '11px 12px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onUpdate ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUpdate(user.uid, { active: !user.active })}
                    >
                      {user.active ? 'Désactiver' : 'Activer'}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(user.uid)}
                  >
                    Supprimer
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
