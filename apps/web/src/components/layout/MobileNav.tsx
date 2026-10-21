'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useSwipe } from '@/hooks/useSwipe'
import { useScrollDirection } from '@/hooks/useScrollDirection'

// All navigation items in order for swipe navigation
const getNavItems = (role: string, plan: string, t: (key: any) => string, orgRole?: string | null) => {
  if (role === 'support_agent') {
    return [
      { href: '/crm', label: t('sidebar.crm') },
      { href: '/team', label: t('sidebar.imports') },
      { href: routes.profile, label: t('header.profile') }
    ]
  }

  const items = [
    { href: routes.search, label: t('header.search') },
    ...(role !== 'admin' ? [{ href: routes.pipeline, label: 'Pipeline' }] : []),
    { href: routes.saved, label: t('sidebar.favorites') },
    ...(plan !== 'free' ? [{ href: routes.ai, label: 'AI' }] : []),
    { href: routes.profile, label: t('header.profile') }
  ]

  if (role === 'manager') {
    const isSM = orgRole === 'senior_manager'
    const dashboardHref = isSM ? routes.dashboard : routes.reporting
    // Insert team + dashboard/reporting after pipeline
    items.splice(
      2,
      0,
      { href: routes.team, label: t('sidebar.team') },
      { href: dashboardHref, label: 'Dashboard' }
    )
  } else if (role === 'admin') {
    items.splice(1, 0, { href: routes.admin, label: t('sidebar.admin') })
  }

  return items
}

const NAV_STYLES = `
@keyframes navPillIn {
  from { transform: translateX(-50%) scaleX(0); opacity: 0; }
  to { transform: translateX(-50%) scaleX(1); opacity: 1; }
}
@keyframes navIconBounce {
  0% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  70% { transform: translateY(0.5px); }
  100% { transform: translateY(0); }
}
.mobile-nav-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 2px;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.2, 0, 0, 1);
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  position: relative;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.mobile-nav-btn:active {
  transform: scale(0.93);
}
.mobile-nav-btn.active {
  color: var(--color-primary, hsl(var(--primary)));
}
.mobile-nav-btn svg {
  width: 21px;
  height: 21px;
  stroke-width: 1.8;
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mobile-nav-btn.active svg {
  stroke-width: 2.3;
  animation: navIconBounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.mobile-nav-btn span {
  font-size: 9.5px;
  font-weight: 500;
  margin-top: 3px;
  font-family: inherit;
  transition: all 150ms ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
  line-height: 1.1;
}
.mobile-nav-btn.active span {
  font-weight: 700;
  color: var(--color-primary, hsl(var(--primary)));
}
.nav-active-pill {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 30px;
  background: var(--color-primary-light, rgba(255, 166, 17, 0.15));
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const PipelineIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="6" height="18" rx="2" />
    <rect x="9" y="8" width="6" height="13" rx="2" />
    <rect x="16" y="13" width="6" height="8" rx="2" />
  </svg>
)
const SavedIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)
const TeamIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const DashboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
)

const AiIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
    <path d="M8 18h8M12 18v4" />
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const ProfileIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const UploadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const AdminIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
)

export function MobileNav() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()
  const isVisible = useScrollDirection({
    containerId: 'main-scroll-container',
    threshold: 24,
    topThreshold: 30,
  })

  // Ordered nav items for swipe support
  const navItems = user ? getNavItems(user.role, user.plan || 'free', t, user.orgRole) : []
  const isSM = user?.role === 'manager' && user?.orgRole === 'senior_manager'
  const dashboardHref = isSM ? routes.dashboard : routes.reporting
  const currentIndex = navItems.findIndex(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_STYLES }} />
      <nav
        ref={swipeRef}
        className={`fixed bottom-0 left-0 right-0 z-[1000] flex items-stretch justify-around overflow-hidden border-t border-border/80 bg-background/80 pb-[env(safe-area-inset-bottom,0px)] shadow-elevation-4 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform, opacity'
        }}
      >
        {user.role === 'support_agent' ? (
          <>
            <NavItem href="/crm" label={t('sidebar.crm')} icon={<PipelineIcon />} />
            <NavItem href="/team" label={t('sidebar.imports')} icon={<UploadIcon />} />
            <NavItem href={routes.profile} label={t('header.profile')} icon={<ProfileIcon />} />
          </>
        ) : (
          <>
            <NavItem href={routes.search} label={t('header.search')} icon={<SearchIcon />} />
            {user.role !== 'admin' && (
              <NavItem
                href={routes.pipeline}
                label="Pipeline"
                icon={<PipelineIcon />}
              />
            )}
            <NavItem href={routes.saved} label={t('sidebar.favorites')} icon={<SavedIcon />} />

            {user.role === 'manager' && (
              <>
                <NavItem href={routes.team} label={t('sidebar.team')} icon={<TeamIcon />} />
                <NavItem href={dashboardHref} label="Dashboard" icon={<DashboardIcon />} />
              </>
            )}
            {user.role === 'admin' && (
              <NavItem href={routes.admin} label={t('sidebar.admin')} icon={<AdminIcon />} />
            )}

            {user.plan !== 'free' && <NavItem href={routes.ai} label="AI" icon={<AiIcon />} />}
            <NavItem href={routes.profile} label={t('header.profile')} icon={<ProfileIcon />} />
          </>
        )}
      </nav>
    </>
  )
}
