'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { useSwipe } from '@/hooks/useSwipe'

// All navigation items in order for swipe navigation
const getNavItems = (role: string, t: (key: any) => string) => {
  const items = [
    { href: routes.search, label: t('header.search') },
    { href: routes.pipeline, label: t('sidebar.pipeline') },
    { href: routes.saved, label: t('sidebar.saved') },
    { href: routes.ai, label: t('header.aiAssistant') },
    { href: routes.profile, label: t('header.profile') }
  ]

  if (role === 'manager') {
    // Insert team + reporting after pipeline
    items.splice(2, 0,
      { href: routes.team, label: t('sidebar.team') },
      { href: routes.reporting, label: 'Dashboard' }
    )
  } else if (role === 'admin') {
    items.splice(2, 0, { href: routes.admin, label: t('sidebar.admin') })
  }

  return items
}

const navStyles = `
@keyframes navPillIn {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}
@keyframes navIconBounce {
  0% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
  70% { transform: translateY(1px); }
  100% { transform: translateY(0); }
}
.mobile-nav-btn {
  flex: 1;
  min-width: 64px;
  flex-shrink: 0;
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
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.mobile-nav-btn.active {
  color: var(--color-accent);
}
.mobile-nav-btn svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
  transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
}
.mobile-nav-btn.active svg {
  stroke-width: 2.4;
  animation: navIconBounce 300ms ease forwards;
}
.mobile-nav-btn span {
  font-size: 10px;
  font-weight: 500;
  margin-top: 3px;
  font-family: inherit;
  transition: all 200ms ease;
  white-space: nowrap;
}
.mobile-nav-btn.active span {
  font-weight: 700;
  color: var(--color-accent);
}
.nav-active-pill {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 30px;
  background: rgba(55, 138, 221, 0.14);
  border-radius: 10px;
  animation: navPillIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
nav::-webkit-scrollbar {
  display: none;
}
`

type NavItemProps = {
  href: string
  icon: React.ReactNode
  label: string
}

function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link href={href} className={`mobile-nav-btn ${active ? 'active' : ''}`}>
      {active && <div className="nav-active-pill" />}
      {icon}
      <span>{label}</span>
    </Link>
  )
}

// SVG icon components
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const PipelineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="6" height="18" rx="2" />
    <rect x="9" y="8" width="6" height="13" rx="2" />
    <rect x="16" y="13" width="6" height="8" rx="2" />
  </svg>
)
const SavedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)
const TeamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
)
const AiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
    <path d="M8 18h8M12 18v4" />
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
)
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
)

export function MobileNav() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()

  // Ordered nav items for swipe support
  const navItems = user ? getNavItems(user.role, t) : []
  const currentIndex = navItems.findIndex(
    item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  )

  // Swipe: navigate to adjacent pages
  const swipeRef = useSwipe<HTMLElement>({
    threshold: 80,
    onSwipeLeft: () => {
      if (currentIndex >= 0 && currentIndex < navItems.length - 1) {
        router.push(navItems[currentIndex + 1]!.href)
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        router.push(navItems[currentIndex - 1]!.href)
      }
    }
  })

  if (!user) return null

  // Inject styles
  if (typeof document !== 'undefined' && !document.getElementById('mobile-nav-styles')) {
    const style = document.createElement('style')
    style.id = 'mobile-nav-styles'
    style.innerHTML = navStyles
    document.head.appendChild(style)
  }

  return (
    <nav
      ref={swipeRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: `${colors.bg2}f0`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
        WebkitOverflowScrolling: 'touch' as any,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04), 0 -8px 32px rgba(0,0,0,0.15)',
        zIndex: 1000
      }}
    >
      <NavItem href={routes.search} label={t('header.search')} icon={<SearchIcon />} />
      <NavItem href={routes.pipeline} label={t('sidebar.pipeline')} icon={<PipelineIcon />} />
      <NavItem href={routes.saved} label={t('sidebar.saved')} icon={<SavedIcon />} />

      {user.role === 'manager' && (
        <>
          <NavItem href={routes.team} label={t('sidebar.team')} icon={<TeamIcon />} />
          <NavItem href={routes.reporting} label="Dashboard" icon={<DashboardIcon />} />
        </>
      )}
      {user.role === 'admin' && (
        <NavItem href={routes.admin} label={t('sidebar.admin')} icon={<AdminIcon />} />
      )}

      <NavItem href={routes.ai} label="AI" icon={<AiIcon />} />
      <NavItem href={routes.profile} label={t('header.profile')} icon={<ProfileIcon />} />
    </nav>
  )
}
