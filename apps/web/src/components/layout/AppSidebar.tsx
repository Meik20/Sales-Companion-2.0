'use client'

import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ScIcon } from '@/components/ui/ScIcon'
import { SidebarLink } from './SidebarLink'
import { colors } from '@/styles/tokens'

export function AppSidebar() {
  const { user } = useCurrentUser()

  if (!user) return null

  return (
    <aside
      style={{
        width: 232,
        minWidth: 232,
        borderRight: `1px solid ${colors.border}`,
        padding: '20px 12px',
        background: colors.bg2,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Logo sidebar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          padding: '0 8px',
        }}
      >
        <ScIcon size={24} />
        <span
          style={{
            fontFamily: "'Syne',sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: colors.text,
          }}
        >
          Sales Companion
        </span>
      </div>

      {/* Navigation principale */}
      <SidebarLink href={routes.search}   label="Recherche"              icon="🔍" />
      <SidebarLink href={routes.pipeline} label="Pipeline"              icon="📊" />
      <SidebarLink href={routes.saved}    label="Recherches sauvegardées" icon="🔖" />
      <SidebarLink href={routes.support}  label="Support"               icon="💬" />
      <SidebarLink href={routes.profile}  label="Profil"                icon="👤" />
      <SidebarLink href={routes.settings} label="Paramètres"            icon="⚙️" />

      {/* Manager */}
      {user?.role === 'manager' ? (
        <>
          <div
            style={{
              marginTop: 16,
              marginBottom: 4,
              padding: '0 8px',
              fontSize: 10,
              fontWeight: 700,
              color: colors.textDim,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            Équipe
          </div>
          <SidebarLink href={routes.team} label="Mon équipe" icon="👥" />
        </>
      ) : null}

      {/* Admin */}
      {user?.role === 'admin' ? (
        <>
          <div
            style={{
              marginTop: 16,
              marginBottom: 4,
              padding: '0 8px',
              fontSize: 10,
              fontWeight: 700,
              color: '#F5A623',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            Administration
          </div>
          <SidebarLink href={routes.adminDashboard} label="Dashboard"      icon="📈" />
          <SidebarLink href={routes.adminUsers}     label="Utilisateurs"   icon="👤" />
          <SidebarLink href={routes.adminCompanies} label="Entreprises"    icon="🏢" />
          <SidebarLink href={routes.adminImports}   label="Imports"        icon="📥" />
          <SidebarLink href={routes.adminSupport}   label="Support admin"  icon="🎧" />
          <SidebarLink href={routes.adminConfig}    label="Configuration"  icon="🔧" />
        </>
      ) : null}
    </aside>
  )
}
