import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProfileCard } from '@/features/profile/components/ProfileCard'

export default function ProfilePage() {
  return (
    <AppShell>
      <PageHeader
        title="Profil"
        subtitle="Informations de compte et statistiques d'utilisation."
      />
      <ProfileCard />
    </AppShell>
  )
}
