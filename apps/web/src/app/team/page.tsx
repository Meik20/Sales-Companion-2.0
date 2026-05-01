'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { TeamMembersSection } from '@/features/team/components/TeamMembersSection'
import { CreateAssignmentForm } from '@/features/team/components/CreateAssignmentForm'
import { AssignmentsTable } from '@/features/team/components/AssignmentsTable'
import { TeamAccessManager } from '@/features/team/components/TeamAccessManager'

export default function TeamPage() {
  return (
    <AppShell>
      <PageHeader
        title="Gestion de l'équipe"
        subtitle="Gérez les membres de votre équipe et leurs assignations de prospects."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamAccessManager />
        <TeamMembersSection />
        <CreateAssignmentForm />
        <AssignmentsTable />
      </div>
    </AppShell>
  )
}