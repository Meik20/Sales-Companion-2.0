'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { TeamMembersSection } from '@/features/team/components/TeamMembersSection'
import { CreateAssignmentForm } from '@/features/team/components/CreateAssignmentForm'
import { AssignmentsTable } from '@/features/team/components/AssignmentsTable'
import { TeamAccessManager } from '@/features/team/components/TeamAccessManager'
import { ImportProspectsForm } from '@/features/imports/components/ImportProspectsForm'
import { ManagerProspectsList } from '@/features/imports/components/ManagerProspectsList'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers'
import { colors } from '@/styles/tokens'

type Tab = 'team' | 'imports'

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<Tab>('team')
  const [importRefresh, setImportRefresh] = useState(0)
  const { user } = useCurrentUser()
  const { data: members = [] } = useTeamMembers()

  const isManager = user?.role === 'manager'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'team',    label: 'Mon équipe',         icon: '👥' },
    ...(isManager ? [{ id: 'imports' as Tab, label: 'Mes prospects importés', icon: '📋' }] : []),
  ]

  return (
    <AppShell>
      <PageHeader
        title="Gestion de l'équipe"
        subtitle="Gérez les membres de votre équipe, leurs accès et vos prospects importés."
      />

      {/* Onglets — uniquement si manager */}
      {isManager && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: 0,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id
                  ? `2px solid ${colors.green}`
                  : '2px solid transparent',
                color: activeTab === tab.id ? colors.green : colors.textMid,
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenu selon onglet */}
      {activeTab === 'team' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TeamAccessManager />
          <TeamMembersSection />
          <CreateAssignmentForm />
          <AssignmentsTable />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section Import */}
          <div style={{
            background: colors.surface,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            padding: 20,
          }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: '0 0 4px' }}>
                📥 Importer une base de prospects
              </h2>
              <p style={{ fontSize: 12.5, color: colors.textMid, margin: 0 }}>
                Importez vos prospects depuis un fichier CSV. La base sera accessible uniquement à vous et votre équipe.
              </p>
            </div>
            {user?.uid && (
              <ImportProspectsForm
                managerId={user.uid}
                onImported={(count) => {
                  setImportRefresh((n) => n + 1)
                }}
              />
            )}
          </div>

          {/* Section Liste */}
          <div style={{
            background: colors.surface,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            padding: 20,
          }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: '0 0 4px' }}>
                📋 Mes prospects
              </h2>
              <p style={{ fontSize: 12.5, color: colors.textMid, margin: 0 }}>
                Retrouvez tous vos prospects importés et assignez-les aux membres de votre équipe.
              </p>
            </div>
            {user?.uid && (
              <ManagerProspectsList
                managerId={user.uid}
                members={members.map((m) => ({ uid: m.uid, name: m.name, email: m.email }))}
                refreshTrigger={importRefresh}
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}