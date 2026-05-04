'use client'

import { useState, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { TeamMembersSection } from '@/features/team/components/TeamMembersSection'
import { CreateAssignmentForm } from '@/features/team/components/CreateAssignmentForm'
import { AssignmentsTable } from '@/features/team/components/AssignmentsTable'
import { TeamAccessManager } from '@/features/team/components/TeamAccessManager'
import { ImportProspectsForm } from '@/features/imports/components/ImportProspectsForm'
import { ManagerProspectsList, type Prospect } from '@/features/imports/components/ManagerProspectsList'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers'
import { colors } from '@/styles/tokens'

type Tab = 'team' | 'imports'

export default function TeamPage() {
  const [activeTab, setActiveTab]           = useState<Tab>('team')
  const [importRefresh, setImportRefresh]   = useState(0)
  const [selectedProspects, setSelectedProspects] = useState<Prospect[]>([])
  const assignFormRef = useRef<HTMLDivElement>(null)

  const { user }          = useCurrentUser()
  const { data: members = [] } = useTeamMembers()

  const isManager = user?.role === 'manager'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'team',    label: 'Mon équipe',             icon: '👥' },
    ...(isManager ? [{ id: 'imports' as Tab, label: 'Mes prospects importés', icon: '📋' }] : []),
  ]

  /**
   * Called when the user clicks "Assigner la sélection" in ManagerProspectsList.
   * Switches to the "team" tab and scrolls to the assignment form.
   */
  function handleAssignSelection(prospects: Prospect[]) {
    setSelectedProspects(prospects)
    setActiveTab('team')
    // Small delay to let React render the team tab before scrolling
    setTimeout(() => {
      assignFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  /** Called after assignments have been created — clears selection */
  function handleAssigned() {
    setSelectedProspects([])
    setImportRefresh((n) => n + 1)
  }

  return (
    <AppShell>
      <PageHeader
        title="Gestion de l'équipe"
        subtitle="Gérez les membres de votre équipe, leurs accès et vos prospects importés."
      />

      {/* ── Onglets (managers only) ── */}
      {isManager && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
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
              {/* Badge on "imports" tab when prospects are selected */}
              {tab.id === 'imports' && selectedProspects.length > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: colors.green, color: '#fff',
                  fontSize: 10, fontWeight: 700, lineHeight: '16px',
                  padding: '0 4px', textAlign: 'center',
                }}>
                  {selectedProspects.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Contenu ── */}
      {activeTab === 'team' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <TeamAccessManager />
          <TeamMembersSection />

          {/* Assignment form — receives pre-selected prospects from imports tab */}
          <div ref={assignFormRef}>
            {selectedProspects.length > 0 && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 4,
                background: 'rgba(46,160,90,0.08)',
                border: '1px solid rgba(46,160,90,0.2)',
                fontSize: 12.5, color: colors.textMid,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span>
                  <span style={{ color: colors.green, fontWeight: 700 }}>
                    {selectedProspects.length} prospect{selectedProspects.length > 1 ? 's' : ''}
                  </span>
                  {' '}sélectionné{selectedProspects.length > 1 ? 's' : ''} depuis la liste d&apos;imports
                </span>
                <button
                  onClick={() => setSelectedProspects([])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: colors.textMid, lineHeight: 1,
                  }}
                  title="Effacer la sélection"
                >
                  ×
                </button>
              </div>
            )}
            <CreateAssignmentForm
              selectedProspects={selectedProspects}
              onAssigned={handleAssigned}
            />
          </div>

          <AssignmentsTable />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Import section */}
          <div style={{
            background: colors.surface, borderRadius: 14,
            border: `1px solid ${colors.border}`, padding: 20,
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
                onImported={() => setImportRefresh((n) => n + 1)}
              />
            )}
          </div>

          {/* Prospects list with selection */}
          <div style={{
            background: colors.surface, borderRadius: 14,
            border: `1px solid ${colors.border}`, padding: 20,
          }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: '0 0 4px' }}>
                  📋 Mes prospects
                </h2>
                <p style={{ fontSize: 12.5, color: colors.textMid, margin: 0 }}>
                  Cochez des prospects et cliquez sur &quot;Assigner la sélection&quot; pour les retrouver dans le formulaire d&apos;assignation.
                </p>
              </div>
              {selectedProspects.length > 0 && (
                <button
                  onClick={() => { setActiveTab('team'); setTimeout(() => assignFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 150) }}
                  style={{
                    flexShrink: 0, height: 34, padding: '0 14px',
                    background: colors.green, color: '#fff',
                    border: 'none', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  Aller au formulaire ↗
                </button>
              )}
            </div>
            {user?.uid && (
              <ManagerProspectsList
                managerId={user.uid}
                members={members.map((m) => ({ uid: m.uid, name: m.name, email: m.email, active: m.active }))}
                refreshTrigger={importRefresh}
                onAssignSelection={handleAssignSelection}
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}