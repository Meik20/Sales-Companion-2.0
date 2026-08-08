'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SidebarLink } from './SidebarLink'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { useToast } from '@/hooks/useToast'
import { usePipelineStats } from '@/features/pipeline/hooks/usePipelineStats'
import {
  Search,
  BarChart2,
  MessageSquare,
  Bookmark,
  WifiOff,
  Users,
  Settings,
  LayoutDashboard,
  UserCheck,
  Building2,
  Upload,
  Headphones,
  Activity,
  Sliders,
  LogOut,
  MapPin,
  Filter,
  Moon,
  Sun,
  Globe,
  CreditCard
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from '@/providers/I18nProvider'

const REGIONS = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extrême-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest'
]
const REGION_KEYS: Record<string, string> = {
  Adamaoua: 'adamaoua',
  Centre: 'centre',
  Est: 'est',
  'Extrême-Nord': 'extremeNord',
  Littoral: 'littoral',
  Nord: 'nord',
  'Nord-Ouest': 'nordOuest',
  Ouest: 'ouest',
  Sud: 'sud',
  'Sud-Ouest': 'sudOuest'
}
const CITIES_BY_REGION: Record<string, string[]> = {
  Adamaoua: ['Ngaoundéré', 'Meiganga', 'Tibati', 'Ngaoundal', 'Banyo'],
  Centre: ['Yaoundé', 'Mbalmayo', 'Bafia', 'Eséka', 'Nanga-Eboko', 'Obala', 'Monatélé'],
  Est: ['Bertoua', 'Abong-Mbang', 'Batouri', 'Yokadouma', 'Dimako'],
  'Extrême-Nord': ['Maroua', 'Mokolo', 'Kousseri', 'Yagoua', 'Mora'],
  Littoral: ['Douala', 'Nkongsamba', 'Edéa', 'Loum', 'Mbanga'],
  Nord: ['Garoua', 'Guider', 'Pitoa', 'Lagdo', 'Ngong'],
  'Nord-Ouest': ['Bamenda', 'Kumbo', 'Wum', 'Mbengwi', 'Fundong'],
  Ouest: ['Bafoussam', 'Dschang', 'Mbouda', 'Foumban', 'Bangangté'],
  Sud: ['Ebolowa', 'Sangmélima', 'Kribi', 'Ambam', 'Lolodorf'],
  'Sud-Ouest': ['Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko']
}
const SECTORS = [
  'Commerce',
  'BTP & Construction',
  'Industrie manufacturière',
  'Agriculture & Agroalimentaire',
  'Services & Conseil',
  'Transport & Logistique',
  'Hôtellerie & Restauration',
  'Santé',
  'Éducation & Formation',
  'Technologies & Numérique',
  'Finance & Assurance',
  'Énergie & Mines'
]
const SECTOR_KEYS: Record<string, string> = {
  Commerce: 'commerce',
  'BTP & Construction': 'btp',
  'Industrie manufacturière': 'industrie',
  'Agriculture & Agroalimentaire': 'agro',
  'Services & Conseil': 'services',
  'Transport & Logistique': 'transport',
  'Hôtellerie & Restauration': 'hotellerie',
  Santé: 'sante',
  'Éducation & Formation': 'education',
  'Technologies & Numérique': 'tech',
  'Finance & Assurance': 'finance',
  'Énergie & Mines': 'energie'
}
const CAMEROON_ZONES = [
  { region: 'Littoral', city: 'Douala', lat: 4.05, lng: 9.7 },
  { region: 'Centre', city: 'Yaoundé', lat: 3.87, lng: 11.52 },
  { region: 'Ouest', city: 'Bafoussam', lat: 5.48, lng: 10.42 },
  { region: 'Nord-Ouest', city: 'Bamenda', lat: 5.96, lng: 10.16 },
  { region: 'Sud-Ouest', city: 'Buea', lat: 4.15, lng: 9.24 },
  { region: 'Adamaoua', city: 'Ngaoundéré', lat: 7.33, lng: 13.58 },
  { region: 'Nord', city: 'Garoua', lat: 9.3, lng: 13.4 },
  { region: 'Extrême-Nord', city: 'Maroua', lat: 10.6, lng: 14.33 },
  { region: 'Est', city: 'Bertoua', lat: 4.58, lng: 13.68 },
  { region: 'Sud', city: 'Ebolowa', lat: 2.9, lng: 11.15 }
]
function nearestZone(lat: number, lng: number) {
  let best = CAMEROON_ZONES[0]
  let bestDist = Infinity
  for (const z of CAMEROON_ZONES) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) {
      bestDist = d
      best = z
    }
  }
  return best!
}

// ── Section label separator ─────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[.09em] text-muted-foreground select-none">
      {children}
    </div>
  )
}

function SectionDivider() {
  return <hr className="my-2 border-0 border-t border-border/70" />
}

export function AppSidebar({
  isMobile = false,
  onCloseAction
}: {
  isMobile?: boolean
  onCloseAction?: () => void
}) {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const { pushToast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const [radius, setRadius] = useState('10 km')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [sector, setSector] = useState('')
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done'>('idle')

  const { theme, setTheme } = useTheme()
  const { t, lang, setLang } = useTranslation()

  // Pipeline stats for badge
  const pipelineStats = usePipelineStats()
  const totalPipeline = pipelineStats.data
    ? (pipelineStats.data.prospection ?? 0) +
      (pipelineStats.data.negotiation ?? 0) +
      (pipelineStats.data.conclusion ?? 0)
    : 0

  function applyFilters(overrides: { region?: string; sector?: string; city?: string } = {}) {
    const r = overrides.region ?? region
    const s = overrides.sector ?? sector
    const c = overrides.city !== undefined ? overrides.city : city
    const params = new URLSearchParams()
    if (r) params.set('region', r)
    if (s) params.set('sector', s)
    if (c) params.set('city', c)
    const dest = `/search${params.toString() ? '?' + params.toString() : ''}`
    router.push(dest)
    onCloseAction?.()
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(z.region)
        setCity(z.city)
        setGeoState('done')

        const rValue = radius === 'National' ? 50000 : parseInt(radius) * 1000
        const params = new URLSearchParams()
        params.set('region', z.region)
        params.set('city', z.city)
        params.set('lat', pos.coords.latitude.toString())
        params.set('lng', pos.coords.longitude.toString())
        params.set('radius', rValue.toString())
        if (sector) params.set('sector', sector)

        router.push(`/search?${params.toString()}`)
        onCloseAction?.()
      },
      () => setGeoState('idle'),
      { timeout: 8000, maximumAge: 60000 }
    )
  }

  if (!user) return null

  const handleLogout = async () => {
    try {
      await logout()
      pushToast({ type: 'success', title: t('sidebar.logoutSuccess') })
      if (onCloseAction) onCloseAction()
    } catch {
      pushToast({ type: 'error', title: t('sidebar.logoutError') })
    }
  }

  const content = (
    <div
      className={`flex h-full w-full min-w-0 flex-col gap-1 overflow-y-auto bg-transparent px-3 py-5 ${
        isMobile ? 'border-none' : 'border-r border-border/70'
      }`}
    >
      {/* ── User Profile Card ───────────────────────────────────────── */}
      <div className="mb-1 flex items-center gap-2.5 px-2.5 pb-3.5 pt-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[17px] font-bold text-primary">
          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-bold text-foreground">
            {user.name || t('sidebar.user')}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {user.role === 'admin'
              ? t('sidebar.adminRole')
              : user.role === 'manager'
                ? t('sidebar.managerRole')
                : user.role === 'independent'
                  ? t('sidebar.independentRole')
                  : user.role === 'support_agent'
                    ? 'Agent Support'
                    : t('sidebar.memberRole')}{' '}
            ·{' '}
            <span className="uppercase">
              {(user.plan || 'free') === 'free' ? t('header.planFree') : user.plan}
            </span>
          </span>
        </div>
      </div>

      <SectionDivider />

      {/* ── CONDITIONAL RENDER ACCORDING TO ROLE ─────────────────── */}
      {user.role === 'support_agent' ? (
        <>
          <SectionLabel>🎧 Espace Relation Client</SectionLabel>
          <SidebarLink href="/crm" label="Mes Clients CRM" icon={Users} />
          <SidebarLink href="/team" label={t('sidebar.imports')} icon={Upload} />
        </>
      ) : (
        <>
          {/* ── Filtres rapides (Sales / Manager / Admin) ────────────── */}
          <SectionLabel>{t('sidebar.quickFilters')}</SectionLabel>

          {/* Région */}
          <div className="px-2.5 py-0.5">
            <label className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin size={12} /> {t('sidebar.region')}
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value)
                setCity('')
              }}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none"
            >
              <option value="">{t('sidebar.allRegions')}</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {t(`regions.${REGION_KEYS[r]}` as any)}
                </option>
              ))}
            </select>
          </div>

          {/* Ville */}
          {region && (
            <div className="px-2.5 py-0.5">
              <label className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin size={12} /> {t('sidebar.city')}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none"
              >
                <option value="">{t('sidebar.allCities')}</option>
                {CITIES_BY_REGION[region]?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Secteur */}
          <div className="px-2.5 py-0.5">
            <label className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Filter size={12} /> {t('sidebar.sector')}
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none"
            >
              <option value="">{t('sidebar.allSectors')}</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {t(`sectors.${SECTOR_KEYS[s]}` as any)}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-1.5 px-2.5 py-1">
            <button
              onClick={() => applyFilters()}
              className="flex h-[34px] items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-bold text-primary-foreground transition-all duration-150 hover:bg-primary/90"
            >
              <Search size={13} /> {t('sidebar.search')}
            </button>

            <button
              onClick={handleLocateMe}
              disabled={geoState === 'loading'}
              className={`flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-primary/30 text-[12px] font-semibold text-primary transition-all duration-150 ${geoState === 'done' ? 'bg-primary/10' : 'bg-transparent'} ${geoState === 'loading' ? 'cursor-wait' : 'cursor-pointer hover:bg-primary/5'}`}
            >
              <MapPin size={13} />
              {geoState === 'loading'
                ? t('sidebar.detecting')
                : geoState === 'done'
                  ? `${t('sidebar.aroundMe')} ✓`
                  : t('sidebar.aroundMe')}
            </button>

            <div className="flex items-center justify-between px-0.5 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Filter size={11} /> {t('sidebar.radius')}
              </span>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="rounded-md border border-border bg-transparent px-1.5 py-0.5 text-[11px] text-foreground outline-none"
              >
                <option className="bg-popover text-foreground">5 km</option>
                <option className="bg-popover text-foreground">10 km</option>
                <option className="bg-popover text-foreground">50 km</option>
                <option className="bg-popover text-foreground">National</option>
              </select>
            </div>
          </div>

          <SectionDivider />

          {/* ── P4 — Section: Outils Principaux ─────────────────────────── */}
          <SectionLabel>{t('sidebar.prospection')}</SectionLabel>
          <SidebarLink href={routes.search} label={t('sidebar.searchProspects')} icon={Search} />
          <SidebarLink
            href={routes.pipeline}
            label={t('sidebar.pipeline')}
            icon={BarChart2}
            badge={totalPipeline > 0 ? totalPipeline : undefined}
          />
          <SidebarLink href={routes.saved} label={t('sidebar.savedSearches')} icon={Bookmark} />
          <SidebarLink href={routes.support} label={t('sidebar.support')} icon={MessageSquare} />

          {/* Disabled item */}
          <div className="flex cursor-not-allowed select-none items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground opacity-50">
            <WifiOff size={16} strokeWidth={1.8} className="shrink-0" />
            {t('sidebar.offlineMode')}
          </div>
        </>
      )}

      {/* ── P4 — Section: Équipe (Manager uniquement) ─────────────── */}
      {user.role === 'manager' && (
        <>
          <SectionDivider />
          <SectionLabel>{t('sidebar.team')}</SectionLabel>
          <SidebarLink href={routes.team} label={t('sidebar.teamManagement')} icon={Users} />
          <SidebarLink href={routes.reporting} label="Tableau de bord" icon={BarChart2} />
        </>
      )}

      {/* ── P4 — Section: Paramètres ────────────────────────────────── */}
      <SectionDivider />
      <SectionLabel>{t('sidebar.account')}</SectionLabel>
      <SidebarLink href={routes.settings} label={t('sidebar.settings')} icon={Settings} />

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-secondary"
      >
        <span className="flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground">
          {theme === 'dark' ? (
            <Sun size={16} strokeWidth={1.8} />
          ) : (
            <Moon size={16} strokeWidth={1.8} />
          )}
          {t('sidebar.theme')} : {theme === 'dark' ? t('sidebar.light') : t('sidebar.dark')}
        </span>
      </button>

      <button
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-secondary"
      >
        <span className="flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground">
          <Globe size={16} strokeWidth={1.8} />
          {lang === 'fr' ? 'English (EN)' : 'Français (FR)'}
        </span>
      </button>

      {/* ── Admin Section ───────────────────────────────────────────── */}
      {user.role === 'admin' && (
        <>
          <SectionDivider />
          <SectionLabel>{t('sidebar.admin')}</SectionLabel>
          <SidebarLink
            href={routes.adminDashboard}
            label={t('sidebar.dashboard')}
            icon={LayoutDashboard}
          />
          <SidebarLink href={routes.adminUsers} label={t('sidebar.users')} icon={UserCheck} />
          <SidebarLink
            href={routes.adminCompanies}
            label={t('sidebar.companies')}
            icon={Building2}
          />
          <SidebarLink href={routes.adminImports} label={t('sidebar.imports')} icon={Upload} />
          <SidebarLink href={routes.adminSupport} label={t('sidebar.support')} icon={Headphones} />
          <SidebarLink href={routes.adminLogs} label={t('sidebar.activity')} icon={Activity} />
          <SidebarLink href={routes.adminConfig} label={t('sidebar.config')} icon={Sliders} />
          <SidebarLink href={routes.adminPayments} label={t('sidebar.payments')} icon={CreditCard} />
        </>
      )}

      {/* ── Logout ──────────────────────────────────────────────────── */}
      <div className="mt-auto pt-2">
        <SectionDivider />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-destructive transition-all duration-200 hover:bg-destructive/10"
        >
          <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
          {t('sidebar.logout')}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] flex">
        {/* Dark backdrop — tap to close */}
        <div
          onClick={onCloseAction}
          className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
        />

        <div
          className="relative h-full w-[300px] max-w-[85vw] overflow-y-auto bg-background shadow-[4px_0_32px_rgba(0,0,0,0.45)]"
          style={{ animation: 'slideInLeft 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {content}
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `
          }}
        />
      </div>
    )
  }

  return (
    <aside className="sticky top-[60px] h-[calc(100vh-60px)] w-[300px] shrink-0 overflow-hidden">
      {content}
    </aside>
  )
}
