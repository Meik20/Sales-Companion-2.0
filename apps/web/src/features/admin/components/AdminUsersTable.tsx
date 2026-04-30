import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import type { UserDoc } from '@sales-companion/shared'

type UserWithId = UserDoc & { id?: string }

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

export function AdminUsersTable({ users, onDelete, onUpdate }: Props) {
  if (!users.length) {
    return <p style={{ color: colors.textMid, textAlign: 'center', padding: '32px 0' }}>Aucun utilisateur.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {['Nom', 'Email', 'Rôle', 'Plan', 'Quota', 'Statut', 'Actions'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.textMid,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  borderBottom: `1px solid ${colors.border}`,
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
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <td style={{ padding: '12px 12px', color: colors.text, fontWeight: 600 }}>
                {user.name || '—'}
              </td>
              <td style={{ padding: '12px 12px', color: colors.textMid }}>
                {user.email}
              </td>
              <td style={{ padding: '12px 12px' }}>
                <Badge variant={roleBadge[user.role] ?? 'default'}>{user.role}</Badge>
              </td>
              <td style={{ padding: '12px 12px' }}>
                <Badge variant={planBadge[user.plan] ?? 'default'}>{user.plan}</Badge>
              </td>
              <td style={{ padding: '12px 12px', color: colors.textMid }}>
                {user.dailyUsed} / {user.dailyLimit}
              </td>
              <td style={{ padding: '12px 12px' }}>
                <Badge variant={user.active ? 'success' : 'danger'}>
                  {user.active ? 'Actif' : 'Inactif'}
                </Badge>
              </td>
              <td style={{ padding: '12px 12px' }}>
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
