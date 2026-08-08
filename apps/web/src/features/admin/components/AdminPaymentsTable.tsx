'use client'

import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/providers/I18nProvider'
import type { AdminPaymentItem } from '../hooks/useAdminPayments'
import {
  CreditCard,
  User,
  Shield,
  Zap,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react'

type Props = {
  payments: AdminPaymentItem[]
  onValidate: (reference: string) => void
  onReject: (reference: string) => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

export function AdminPaymentsTable({ payments, onValidate, onReject }: Props) {
  const { t } = useTranslation()

  if (!payments.length) {
    return (
      <p style={{ color: 'var(--muted-foreground, #94a3b8)', textAlign: 'center', padding: '32px 0' }}>
        {t('admin.noPayments') || 'Aucune demande de paiement.'}
      </p>
    )
  }

  const headers = [
    { label: t('admin.paymentDate') || 'Date', icon: <Calendar size={12} /> },
    { label: t('admin.paymentUser') || 'Utilisateur', icon: <User size={12} /> },
    { label: t('admin.paymentPlan') || 'Plan demandé', icon: <Zap size={12} /> },
    { label: t('admin.paymentAmount') || 'Montant', icon: <CreditCard size={12} /> },
    { label: t('admin.paymentOperator') || 'Opérateur / Transaction', icon: <Shield size={12} /> },
    { label: t('admin.paymentStatus') || 'Statut', icon: <HelpCircle size={12} /> },
    { label: t('admin.paymentActions') || 'Actions', icon: <Settings size={12} /> }
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12.5
        }}
      >
        <thead>
          <tr style={{ background: 'var(--secondary, #1e2a3b)' }}>
            {headers.map((h) => (
              <th
                key={h.label}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #94a3b8)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  borderBottom: `2px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  whiteSpace: 'nowrap'
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
          {payments.map((payment) => {
            const isPending = payment.status === 'MANUAL_PENDING'

            return (
              <tr
                key={payment.reference}
                style={{
                  borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  transition: 'background 150ms ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--secondary, #1e2a3b)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Date */}
                <td style={{ padding: '16px 12px', color: 'var(--muted-foreground, #94a3b8)', whiteSpace: 'nowrap' }}>
                  {formatDate(payment.createdAt)}
                </td>

                {/* Utilisateur */}
                <td style={{ padding: '16px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--foreground, #f1f5f9)',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={payment.userId || ''}
                    >
                      {payment.userEmail || '—'}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #64748b)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      Ref: {payment.reference}
                    </span>
                  </div>
                </td>

                {/* Plan */}
                <td style={{ padding: '16px 12px' }}>
                  <Badge
                    variant={
                      payment.plan === 'enterprise'
                        ? 'gold'
                        : payment.plan === 'pro'
                          ? 'success'
                          : payment.plan === 'starter'
                            ? 'info'
                            : 'default'
                    }
                  >
                    {payment.plan?.toUpperCase()}
                  </Badge>
                </td>

                {/* Montant */}
                <td style={{ padding: '16px 12px', fontWeight: 700, color: 'var(--foreground, #f1f5f9)' }}>
                  {payment.amount !== null ? `${payment.amount.toLocaleString('fr-FR')} FCFA` : '—'}
                </td>

                {/* Opérateur / Transaction */}
                <td style={{ padding: '16px 12px', color: 'var(--muted-foreground, #94a3b8)' }}>
                  <div style={{ fontWeight: 600 }}>{payment.operator || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', marginTop: 2 }}>
                    ID: {payment.transactionId || '—'}
                  </div>
                </td>

                {/* Statut */}
                <td style={{ padding: '16px 12px' }}>
                  {payment.status === 'MANUAL_PENDING' ? (
                    <Badge variant="warning">
                      {t('admin.paymentStatusPending') || 'En attente'}
                    </Badge>
                  ) : payment.status === 'SUCCESSFUL' ? (
                    <Badge variant="success">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={10} />
                        {t('admin.paymentStatusDone') || 'Validé'}
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="danger">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={10} />
                        {t('admin.paymentStatusFailed') || 'Échoué'}
                      </span>
                    </Badge>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '16px 12px' }}>
                  {isPending ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onValidate(payment.reference)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: 8
                        }}
                      >
                        {t('admin.validateBtn') || 'Valider'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onReject(payment.reference)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: 8
                        }}
                      >
                        {t('admin.rejectBtn') || 'Rejeter'}
                      </Button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic' }}>
                      —
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
