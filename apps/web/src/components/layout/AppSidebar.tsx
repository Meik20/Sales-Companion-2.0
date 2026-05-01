'use client'

import { useState } from 'react'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SidebarLink } from './SidebarLink'
import { colors } from '@/styles/tokens'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { useToast } from '@/hooks/useToast'

export function AppSidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const { pushToast } = useToast()
  
  // Simulation d'état pour les menus (en production on branchera sur le profil/settings)
  const [radius, setRadius] = useState('10 km')

  if (!user) return null

  const handleLogout = async () => {
    try {
      await logout()
      pushToast({ type: 'success', title: 'Déconnexion réussie' })
      if (onClose) onClose()
    } catch {
      pushToast({ type: 'error', title: 'Erreur de déconnexion' })
    }
  }

  const content = (
    <div
      style={{
        width: 280,
        minWidth: 280,
        height: '100%',
        background: colors.bg2,
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      {/* 👤 Profil & Plan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 16px' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: colors.greenLight,
            color: colors.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '👤'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: colors.text, fontSize: 15 }}>
            {user.name || 'Utilisateur'}
          </span>
          <span style={{ fontSize: 13, color: colors.textMid, display: 'flex', alignItems: 'center', gap: 4 }}>
            Plan : {user.role === 'admin' ? 'Admin' : 'Free'} <span style={{ color: colors.green }}>🟢</span>
          </span>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />

      {/* 📍 Contexte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', fontSize: 13, color: colors.textMid }}>
          <span style={{ fontSize: 16 }}>📍</span> Ma position (Cameroun)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', fontSize: 13, color: colors.textMid }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16 }}>🔄</span> Rayon
          </div>
          <select 
            value={radius} 
            onChange={e => setRadius(e.target.value)}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '4px 8px',
              color: colors.text,
              fontSize: 12,
              outline: 'none'
            }}
          >
            <option value="5 km">5 km</option>
            <option value="10 km">10 km</option>
            <option value="50 km">50 km</option>
            <option value="National">National</option>
          </select>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />

      {/* 🎯 Outils Principaux */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0' }}>
        <SidebarLink href={routes.search}   label="Prospects autour"       icon="🎯" />
        <SidebarLink href={routes.pipeline} label="Pipeline commercial"    icon="📊" />
        <SidebarLink href={routes.support}  label="Support"                icon="💬" />
        <SidebarLink href={routes.saved}    label="Recherches sauvegardées" icon="🔖" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', fontSize: 13, color: colors.textMid, cursor: 'not-allowed', opacity: 0.7 }}>
          <span style={{ fontSize: 15 }}>📴</span> Mode hors ligne
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />

      {/* ⚙️ Système */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', marginTop: 'auto' }}>
        {user.role === 'manager' && (
          <SidebarLink href={routes.team} label="Équipe" icon="👥" />
        )}
        <SidebarLink href={routes.settings} label="Paramètres" icon="⚙️" />

        {user.role === 'admin' && (
          <>
            <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '8px 0' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 12px 4px' }}>
              Administration
            </div>
            <SidebarLink href={routes.adminDashboard}  label="Dashboard"     icon="📊" />
            <SidebarLink href={routes.adminUsers}      label="Utilisateurs"  icon="👥" />
            <SidebarLink href={routes.adminCompanies}  label="Entreprises"   icon="🏢" />
            <SidebarLink href={routes.adminImports}    label="Imports"       icon="📤" />
            <SidebarLink href={routes.adminSupport}    label="Support"       icon="💬" />
            <SidebarLink href={routes.adminLogs}       label="Activité"      icon="📋" />
            <SidebarLink href={routes.adminConfig}     label="Config"        icon="⚙️" />
          </>
        )}
        
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 9,
            background: 'transparent',
            color: colors.danger,
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = colors.dangerBg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: 15 }}>🚪</span> Déconnexion
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
        }}
      >
        <div 
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }} 
        />
        <div 
          style={{ 
            position: 'relative', 
            background: colors.bg2,
            width: 280, 
            height: '100%',
            animation: 'slideInLeft 300ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {content}
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}} />
      </div>
    )
  }

  return (
    <aside style={{ height: '100%' }}>
      {content}
    </aside>
  )
}
