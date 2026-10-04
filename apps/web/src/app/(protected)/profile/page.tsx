'use client'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProfileCard } from '@/features/profile/components/ProfileCard'
import { useTranslation } from '@/providers/I18nProvider'

export default function ProfilePage() {
  const { t } = useTranslation()
  return (
    <AppShell>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <ProfileCard />
    </AppShell>
  )
}
