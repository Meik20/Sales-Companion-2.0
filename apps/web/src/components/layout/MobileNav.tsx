'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'

// Injection of keyframes and basic CSS for the Bottom Navigation
const navStyles = `
@keyframes navBarIn {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.mobile-nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
  border: none;
  background: transparent;
  color: ${colors.textDim};
  position: relative;
  text-decoration: none;
}
.mobile-nav-btn.active {
  color: ${colors.green};
}
.mobile-nav-btn svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
  transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
}
.mobile-nav-btn.active svg {
  stroke-width: 2.2;
  transform: translateY(-1px);
}
.mobile-nav-btn span {
  font-size: 10px;
  font-weight: 500;
  margin-top: 3px;
  font-family: 'Inter', sans-serif;
}
.mobile-nav-btn.active span {
  font-weight: 700;
  color: ${colors.green};
}
.nav-bar-indicator {
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 3px;
  background: ${colors.green};
  border-radius: 0 0 3px 3px;
  animation: navBarIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
`

export function MobileNav() {
  const { user } = useCurrentUser()
  const pathname = usePathname()

  if (!user) return null

  // Ensure styles are added to head
  if (typeof document !== 'undefined' && !document.getElementById('mobile-nav-styles')) {
    const style = document.createElement('style')
    style.id = 'mobile-nav-styles'
    style.innerHTML = navStyles
    document.head.appendChild(style)
  }

  const NavItem = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))

    return (
      <Link href={href} className={`mobile-nav-btn ${active ? 'active' : ''}`}>
        {active && <div className="nav-bar-indicator" />}
        {icon}
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bg2,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)',
        zIndex: 1000,
      }}
    >
      <NavItem
        href={routes.search}
        label="Recherche"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />
      <NavItem
        href={routes.pipeline}
        label="Pipeline"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      />
      <NavItem
        href={routes.saved}
        label="Sauvegardés"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        }
      />
      {user.role === 'manager' || user.role === 'admin' ? (
        <NavItem
          href={user.role === 'manager' ? routes.team : routes.admin}
          label={user.role === 'manager' ? 'Équipe' : 'Admin'}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      ) : null}
      <NavItem
        href={routes.profile}
        label="Profil"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      />
    </div>
  )
}
