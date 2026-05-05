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
  Search, BarChart2, MessageSquare, Bookmark, WifiOff,
  Users, Settings, LayoutDashboard, UserCheck, Building2,
  Upload, Headphones, Activity, Sliders, LogOut, MapPin, Filter,
} from 'lucide-react'

const REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
]
const CITIES_BY_REGION: Record<string, string[]> = {
  'Adamaoua':    ['Ngaoundéré', 'Meiganga', 'Tibati', 'Ngaoundal', 'Banyo'],
  'Centre':      ['Yaoundé', 'Mbalmayo', 'Bafia', 'Eséka', 'Nanga-Eboko', 'Obala', 'Monatélé'],
  'Est':         ['Bertoua', 'Abong-Mbang', 'Batouri', 'Yokadouma', 'Dimako'],
  'Extrême-Nord':['Maroua', 'Mokolo', 'Kousseri', 'Yagoua', 'Mora'],
  'Littoral':    ['Douala', 'Nkongsamba', 'Edéa', 'Loum', 'Mbanga'],
  'Nord':        ['Garoua', 'Guider', 'Pitoa', 'Lagdo', 'Ngong'],
  'Nord-Ouest':  ['Bamenda', 'Kumbo', 'Wum', 'Mbengwi', 'Fundong'],
  'Ouest':       ['Bafoussam', 'Dschang', 'Mbouda', 'Foumban', 'Bangangté'],
  'Sud':         ['Ebolowa', 'Sangmélima', 'Kribi', 'Ambam', 'Lolodorf'],
  'Sud-Ouest':   ['Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko'],
}
const SECTORS = [
  'Commerce', 'BTP & Construction', 'Industrie manufacturière',
  'Agriculture & Agroalimentaire', 'Services & Conseil', 'Transport & Logistique',
  'Hôtellerie & Restauration', 'Santé', 'Éducation & Formation',
  'Technologies & Numérique', 'Finance & Assurance', 'Énergie & Mines',
]
const CAMEROON_ZONES = [
  { region: 'Littoral',     city: 'Douala',     lat: 4.05,  lng: 9.70  },
  { region: 'Centre',       city: 'Yaoundé',    lat: 3.87,  lng: 11.52 },
  { region: 'Ouest',        city: 'Bafoussam',  lat: 5.48,  lng: 10.42 },
  { region: 'Nord-Ouest',   city: 'Bamenda',    lat: 5.96,  lng: 10.16 },
  { region: 'Sud-Ouest',    city: 'Buea',       lat: 4.15,  lng: 9.24  },
  { region: 'Adamaoua',     city: 'Ngaoundéré', lat: 7.33,  lng: 13.58 },
  { region: 'Nord',         city: 'Garoua',     lat: 9.30,  lng: 13.40 },
  { region: 'Extrême-Nord', city: 'Maroua',     lat: 10.60, lng: 14.33 },
  { region: 'Est',          city: 'Bertoua',    lat: 4.58,  lng: 13.68 },
  { region: 'Sud',          city: 'Ebolowa',    lat: 2.90,  lng: 11.15 },
]
function nearestZone(lat: number, lng: number) {
  let best = CAMEROON_ZONES[0]; let bestDist = Infinity
  for (const z of CAMEROON_ZONES) { const d = Math.hypot(lat - z.lat, lng - z.lng); if (d < bestDist) { bestDist = d; best = z } }
  return best!
}

// ── Section label separator ─────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: colors.textDim,
      textTransform: 'uppercase', letterSpacing: '.09em',
      padding: '10px 12px 4px',
      userSelect: 'none',
    }}>
      {children}
    </div>
  )
}

function SectionDivider() {
  return <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '6px 0' }} />
}

export function AppSidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const { pushToast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const [radius, setRadius]     = useState('10 km')
  const [region, setRegion]     = useState('')
  const [city, setCity]         = useState('')
  const [sector, setSector]     = useState('')
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'done'>('idle')

  // Pipeline stats for badge
  const pipelineStats = usePipelineStats()
  const totalPipeline = pipelineStats.data
    ? (pipelineStats.data.prospection ?? 0) + (pipelineStats.data.negotiation ?? 0)
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
    onClose?.()
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
        applyFilters({ region: z.region, city: z.city })
      },
      () => setGeoState('idle'),
      { timeout: 8000, maximumAge: 60000 }
    )
  }

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
        width: '100%',
        minWidth: 0,
        height: '100%',
        background: 'transparent',
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
      }}
    >
      {/* ── User Profile Card ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px 14px',
        marginBottom: 4,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(55,138,221,0.15)',
          color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, flexShrink: 0,
        }}>
          {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: colors.text, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name || 'Utilisateur'}
          </span>
          <span style={{ fontSize: 11, color: colors.textMid }}>
            {user.role === 'admin' ? '🔴 Admin' : user.role === 'manager' ? '🟡 Manager' : user.role === 'independent' ? '🟢 Indépendant' : '🔵 Membre'} · Plan Free
          </span>
        </div>
      </div>

      <SectionDivider />

      {/* ── Filtres rapides ─────────────────────────────────────────── */}
      <SectionLabel>Filtres rapides</SectionLabel>

      {/* Région */}
      <div style={{ padding: '2px 10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMid, marginBottom: 4 }}>
          <MapPin size={12} /> Région
        </label>
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value)
            setCity('')
          }}
          style={{ width: '100%', height: 32, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', padding: '0 8px' }}
        >
          <option value="">Toutes les régions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Ville */}
      {region && (
        <div style={{ padding: '2px 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMid, marginBottom: 4 }}>
            <MapPin size={12} /> Ville
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ width: '100%', height: 32, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', padding: '0 8px' }}
          >
            <option value="">Toutes les villes</option>
            {CITIES_BY_REGION[region]?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Secteur */}
      <div style={{ padding: '2px 10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMid, marginBottom: 4 }}>
          <Filter size={12} /> Secteur
        </label>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          style={{ width: '100%', height: 32, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', padding: '0 8px' }}
        >
          <option value="">Tous les secteurs</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Buttons */}
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* P1 — Couleur action unifiée : primary blue, pas de vert */}
        <button
          onClick={() => applyFilters()}
          style={{
            height: 34, borderRadius: 8,
            background: 'var(--color-primary)',
            color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-blue-600)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
        >
          <Search size={13} /> Rechercher
        </button>

        <button
          onClick={handleLocateMe}
          disabled={geoState === 'loading'}
          style={{
            height: 34, borderRadius: 8,
            background: geoState === 'done' ? 'rgba(55,138,221,0.12)' : 'transparent',
            color: 'var(--color-accent)',
            border: `1px solid rgba(55,138,221,0.3)`,
            fontSize: 12, fontWeight: 600, cursor: geoState === 'loading' ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 150ms ease',
          }}
        >
          <MapPin size={13} />
          {geoState === 'loading' ? 'Détection…' : geoState === 'done' ? 'Autour de moi ✓' : 'Autour de moi'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: colors.textMid, padding: '0 2px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} /> Rayon
          </span>
          <select value={radius} onChange={(e) => setRadius(e.target.value)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 7px', color: colors.text, fontSize: 11, outline: 'none' }}>
            <option>5 km</option><option>10 km</option><option>50 km</option><option>National</option>
          </select>
        </div>
      </div>

      <SectionDivider />

      {/* ── P4 — Section: Outils Principaux ─────────────────────────── */}
      <SectionLabel>Prospection</SectionLabel>
      <SidebarLink href={routes.search}   label="Recherche prospects" icon={Search}    />
      <SidebarLink href={routes.pipeline} label="Pipeline commercial"  icon={BarChart2} badge={totalPipeline > 0 ? totalPipeline : undefined} />
      <SidebarLink href={routes.saved}    label="Recherches sauvegardées" icon={Bookmark} />
      <SidebarLink href={routes.support}  label="Support"              icon={MessageSquare} />

      {/* Disabled item */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', fontSize: 13, color: colors.textDim, cursor: 'not-allowed', opacity: 0.5, userSelect: 'none' }}>
        <WifiOff size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        Mode hors ligne
      </div>

      {/* ── P4 — Section: Équipe (Manager uniquement) ─────────────── */}
      {user.role === 'manager' && (
        <>
          <SectionDivider />
          <SectionLabel>Équipe</SectionLabel>
          <SidebarLink href={routes.team} label="Gestion d'équipe" icon={Users} />
        </>
      )}

      {/* ── P4 — Section: Paramètres ────────────────────────────────── */}
      <SectionDivider />
      <SectionLabel>Compte</SectionLabel>
      <SidebarLink href={routes.settings} label="Paramètres" icon={Settings} />

      {/* ── Admin Section ───────────────────────────────────────────── */}
      {user.role === 'admin' && (
        <>
          <SectionDivider />
          <SectionLabel>Administration</SectionLabel>
          <SidebarLink href={routes.adminDashboard}  label="Dashboard"     icon={LayoutDashboard} />
          <SidebarLink href={routes.adminUsers}      label="Utilisateurs"  icon={UserCheck}       />
          <SidebarLink href={routes.adminCompanies}  label="Entreprises"   icon={Building2}       />
          <SidebarLink href={routes.adminImports}    label="Imports"       icon={Upload}          />
          <SidebarLink href={routes.adminSupport}    label="Support"       icon={Headphones}      />
          <SidebarLink href={routes.adminLogs}       label="Activité"      icon={Activity}        />
          <SidebarLink href={routes.adminConfig}     label="Config"        icon={Sliders}         />
        </>
      )}

      {/* ── Logout ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <SectionDivider />
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center',
            gap: 10, padding: '9px 12px',
            borderRadius: 9,
            background: 'transparent',
            color: colors.danger,
            border: 'none',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.dangerBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          Déconnexion
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex' }}>
        {/* Dark backdrop — tap to close */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        />

        {/* Sidebar panel — explicit opaque background */}
        <div style={{
          position: 'relative',
          /* Use a hard-coded opaque color that works in both themes */
          background: '#0E1929',   /* deep navy — solid, never transparent */
          width: 300,
          maxWidth: '85vw',
          height: '100%',
          boxShadow: '4px 0 32px rgba(0,0,0,0.45)',
          animation: 'slideInLeft 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
        }}>
          {content}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}} />
      </div>
    )
  }

  return <aside style={{ height: '100%' }}>{content}</aside>
}
