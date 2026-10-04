'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { IndependentImportPanel } from '@/features/profile/components/IndependentImportPanel'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { routes } from '@/constants/routes'
import { useTranslation } from '@/providers/I18nProvider'

export default function ImportPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const { t } = useTranslation()

  const isFree = (user?.plan ?? 'free') === 'free'

  useEffect(() => {
    if (user && isFree) {
      router.replace(`${routes.upgrade}?redirect=${encodeURIComponent(routes.importProspects)}`)
    }
  }, [user, isFree, router])

  return (
    <AppShell>
      <PageHeader
        title={t('sidebar.importProspects') || 'Importer mes prospects'}
        subtitle="Importez vos contacts et prospects au format CSV directement dans votre pipeline commercial"
      />
      <div className="mt-4">
        <IndependentImportPanel />
      </div>
    </AppShell>
  )
}
