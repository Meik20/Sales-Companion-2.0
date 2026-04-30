'use client'

import { useState } from 'react'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SidebarLink } from './SidebarLink'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'

export function MobileNav() {
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label="Ouvrir le menu de navigation"
        onClick={() => setOpen((v) => !v)}
        style={{ gap: 8 }}
      >
        <span style={{ fontSize: 16 }}>{open ? '✕' : '☰'}</span>
        Menu
      </Button>

      {open ? (
        <div
          id="mobile-nav-panel"
          style={{
            marginTop: 8,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 12,
            background: colors.bg2,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeIn 200ms ease',
          }}
        >
          <SidebarLink href={routes.search}   label="Recherche"               icon="🔍" />
          <SidebarLink href={routes.pipeline} label="Pipeline"               icon="📊" />
          <SidebarLink href={routes.saved}    label="Recherches sauvegardées" icon="🔖" />
          <SidebarLink href={routes.support}  label="Support"                icon="💬" />
          <SidebarLink href={routes.profile}  label="Profil"                 icon="👤" />
          <SidebarLink href={routes.settings} label="Paramètres"             icon="⚙️" />

          {user?.role === 'manager' ? (
            <SidebarLink href={routes.team} label="Mon équipe" icon="👥" />
          ) : null}

          {user?.role === 'admin' ? (
            <>
              <SidebarLink href={routes.adminDashboard} label="Dashboard admin"  icon="📈" />
              <SidebarLink href={routes.adminUsers}     label="Utilisateurs"     icon="👤" />
              <SidebarLink href={routes.adminCompanies} label="Entreprises"      icon="🏢" />
              <SidebarLink href={routes.adminImports}   label="Imports"          icon="📥" />
              <SidebarLink href={routes.adminSupport}   label="Support admin"    icon="🎧" />
              <SidebarLink href={routes.adminConfig}    label="Configuration"    icon="🔧" />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
