'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
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

  async function handleValidate(reference: string) {
    const confirmed = window.confirm(
      t('admin.paymentConfirmValidate') ||
        'Voulez-vous vraiment valider ce paiement ? Cela activera immédiatement le plan correspondant pour l\'utilisateur.'
    )
    if (!confirmed) return

    try {
      await validateMutation.mutateAsync({ reference, action: 'validate' })
      pushToast({
        type: 'success',
        title: t('admin.paymentValidated') || 'Paiement validé avec succès'
      })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('admin.paymentError') || 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  async function handleReject(reference: string) {
    const confirmed = window.confirm(
      t('admin.paymentConfirmReject') || 'Voulez-vous vraiment rejeter ce paiement ?'
    )
    if (!confirmed) return

    try {
      await validateMutation.mutateAsync({ reference, action: 'reject' })
      pushToast({
        type: 'success',
        title: t('admin.paymentRejected') || 'Paiement rejeté'
      })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('admin.paymentError') || 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  const payments = paymentsQuery.data?.items ?? []

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
    </AppShell>
  )
}
