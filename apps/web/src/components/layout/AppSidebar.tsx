'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SidebarLink } from './SidebarLink'
import { colors } from '@/styles/tokens'
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
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: colors.textDim,
        textTransform: 'uppercase',
        letterSpacing: '.09em',
        padding: '10px 12px 4px',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  )
}

function SectionDivider() {
  return (
    <hr
      style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '14px 0 8px 0' }}
    />
  )
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
      style={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        background: 'transparent',
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto'
      }}
    >
      {/* ── User Profile Card ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 10px 14px',
          marginBottom: 4
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(55,138,221,0.15)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 700,
              color: colors.text,
              fontSize: 13.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user.name || t('sidebar.user')}
          </span>
          <span style={{ fontSize: 11, color: colors.textMid }}>
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
            <span style={{ textTransform: 'uppercase' }}>
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
          <div style={{ padding: '2px 10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: colors.textMid,
                marginBottom: 4
              }}
            >
              <MapPin size={12} /> {t('sidebar.region')}
            </label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value)
                setCity('')
              }}
              style={{
                width: '100%',
                height: 32,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
                padding: '0 8px'
              }}
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
            <div style={{ padding: '2px 10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: colors.textMid,
                  marginBottom: 4
                }}
              >
                <MapPin size={12} /> {t('sidebar.city')}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                  padding: '0 8px'
                }}
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
          <div style={{ padding: '2px 10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: colors.textMid,
                marginBottom: 4
              }}
            >
              <Filter size={12} /> {t('sidebar.sector')}
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
                padding: '0 8px'
              }}
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
          <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => applyFilters()}
              style={{
                height: 34,
                borderRadius: 8,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 150ms ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-blue-600)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              <Search size={13} /> {t('sidebar.search')}
            </button>

            <button
              onClick={handleLocateMe}
              disabled={geoState === 'loading'}
              style={{
                height: 34,
                borderRadius: 8,
                background: geoState === 'done' ? 'rgba(55,138,221,0.12)' : 'transparent',
                color: 'var(--color-accent)',
                border: `1px solid rgba(55,138,221,0.3)`,
                fontSize: 12,
                fontWeight: 600,
                cursor: geoState === 'loading' ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 150ms ease'
              }}
            >
              <MapPin size={13} />
              {geoState === 'loading'
                ? t('sidebar.detecting')
                : geoState === 'done'
                  ? `${t('sidebar.aroundMe')} ✓`
                  : t('sidebar.aroundMe')}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: colors.textMid,
                padding: '0 2px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Filter size={11} /> {t('sidebar.radius')}
              </span>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: '3px 7px',
                  color: colors.text,
                  fontSize: 11,
                  outline: 'none'
                }}
              >
                <option style={{ background: colors.bg2, color: colors.text }}>5 km</option>
                <option style={{ background: colors.bg2, color: colors.text }}>10 km</option>
                <option style={{ background: colors.bg2, color: colors.text }}>50 km</option>
                <option style={{ background: colors.bg2, color: colors.text }}>National</option>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              fontSize: 13,
              color: colors.textDim,
              cursor: 'not-allowed',
              opacity: 0.5,
              userSelect: 'none'
            }}
          >
            <WifiOff size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderRadius: 9,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'all 200ms ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: colors.textDim,
            fontWeight: 500
          }}
        >
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderRadius: 9,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          transition: 'all 200ms ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: colors.textDim,
            fontWeight: 500
          }}
        >
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
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <SectionDivider />
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
            width: '100%',
            transition: 'all 200ms ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.dangerBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          {t('sidebar.logout')}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex' }}>
        {/* Dark backdrop — tap to close */}
        <div
          onClick={onCloseAction}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)'
          }}
        />

        <div
          style={{
            position: 'relative',
            background: colors.bg,
            width: 300,
            maxWidth: '85vw',
            height: '100%',
            boxShadow: '4px 0 32px rgba(0,0,0,0.45)',
            animation: 'slideInLeft 280ms cubic-bezier(0.16, 1, 0.3, 1)',
            overflowY: 'auto'
          }}
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
    <aside
      style={{
        position: 'sticky',
        top: 60,
        height: 'calc(100vh - 60px)',
        width: 300,
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {content}
    </aside>
  )
}
