'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, ErrorState } from '@/components/feedback/index'
import { DataCard, ConfirmDialog } from '@/components/ui/index'
import { AdminPaymentsTable } from '@/features/admin/components/AdminPaymentsTable'
import { useAdminPayments } from '@/features/admin/hooks/useAdminPayments'
import { useValidateAdminPayment } from '@/features/admin/hooks/useValidateAdminPayment'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'

export default function AdminPaymentsPage() {
  const paymentsQuery = useAdminPayments()
  const validateMutation = useValidateAdminPayment()
  const { pushToast } = useToast()
  const { t } = useTranslation()

  type PendingAction = { reference: string; action: 'validate' | 'reject' }
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  function handleValidate(reference: string) {
    setPendingAction({ reference, action: 'validate' })
    setIsConfirmOpen(true)
  }

  function handleReject(reference: string) {
    setPendingAction({ reference, action: 'reject' })
    setIsConfirmOpen(true)
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    setConfirmLoading(true)
    try {
      await validateMutation.mutateAsync(pendingAction)
      pushToast({
        type: 'success',
        title:
          pendingAction.action === 'validate'
            ? t('admin.paymentValidated') || 'Paiement validé avec succès'
            : t('admin.paymentRejected') || 'Paiement rejeté'
      })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('admin.paymentError') || 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    } finally {
      setConfirmLoading(false)
      setIsConfirmOpen(false)
      setPendingAction(null)
    }
  }

  const payments = paymentsQuery.data?.items ?? []

  const isValidate = pendingAction?.action === 'validate'

  return (
    <AppShell>
      <PageHeader
        title={t('admin.paymentsTitle') || 'Validation des paiements'}
        subtitle={
          t('admin.paymentsSubtitle') || 'Gérez et validez les demandes de paiement manuel de plan.'
        }
      />

      <DataCard title={t('admin.allPayments') || 'Toutes les demandes de paiement'}>
        {paymentsQuery.isLoading ? <LoadingState /> : null}
        {paymentsQuery.isError ? (
          <ErrorState description={t('support.errorLoad') || 'Erreur de chargement.'} />
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError ? (
          <AdminPaymentsTable
            payments={payments}
            onValidate={handleValidate}
            onReject={handleReject}
          />
        ) : null}
      </DataCard>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        variant={isValidate ? 'info' : 'danger'}
        title={
          isValidate
            ? t('admin.paymentConfirmValidate') || 'Valider ce paiement ?'
            : t('admin.paymentConfirmReject') || 'Rejeter ce paiement ?'
        }
        description={
          isValidate
            ? "Cette action activera immédiatement le plan correspondant pour l'utilisateur."
            : 'Le paiement sera définitivement rejeté.'
        }
        confirmText={isValidate ? 'Valider' : 'Rejeter'}
        isLoading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setIsConfirmOpen(false)
          setPendingAction(null)
        }}
      />
    </AppShell>
  )
}
