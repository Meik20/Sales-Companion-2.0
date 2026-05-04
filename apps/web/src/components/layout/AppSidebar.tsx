'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { routes } from '@/constants/routes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SidebarLink } from './SidebarLink'
import { colors } from '@/styles/tokens'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { useToast } from '@/hooks/useToast'

const REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
]
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

export function AppSidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const { pushToast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const [radius, setRadius]   = useState('10 km')
  const [region, setRegion]   = useState('')
  const [sector, setSector]   = useState('')
  const [geoState, setGeoState] = useState<'idle'|'loading'|'done'>('idle')

  function applyFilters(overrides: { region?: string; sector?: string; city?: string } = {}) {
    const r = overrides.region  ?? region
    const s = overrides.sector  ?? sector
    const c = overrides.city    ?? ''
    const params = new URLSearchParams()
    if (r) params.set('region', r)
    if (s) params.set('sector', s)
    if (c) params.set('city', c)
    const dest = `/search${params.toString() ? '?' + params.toString() : ''}`
    if (pathname === '/search') router.push(dest)
    else router.push(dest)
    onClose?.()
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const z = nearestZone(pos.coords.latitude, pos.coords.longitude)
        setRegion(z.region)
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
            background: 'rgba(133, 183, 235, 0.15)',
            color: 'var(--color-accent)',
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

      {/* 🔍 Filtres rapides ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.07em', padding: '0 12px' }}>
          Filtres rapides
        </div>

        {/* Région */}
        <div style={{ padding: '0 12px' }}>
          <label style={{ fontSize: 11, color: colors.textMid, display: 'block', marginBottom: 3 }}>📍 Région</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ width: '100%', height: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', padding: '0 8px' }}
          >
            <option value="">Toutes les régions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Secteur */}
        <div style={{ padding: '0 12px' }}>
          <label style={{ fontSize: 11, color: colors.textMid, display: 'block', marginBottom: 3 }}>🏢 Secteur</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={{ width: '100%', height: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', padding: '0 8px' }}
          >
            <option value="">Tous les secteurs</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Buttons */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => applyFilters()}
            style={{ height: 34, borderRadius: 8, background: colors.green, color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease' }}
          >
            🔍 Rechercher
          </button>
          <button
            onClick={handleLocateMe}
            disabled={geoState === 'loading'}
            style={{ height: 34, borderRadius: 8, background: geoState === 'done' ? 'rgba(46,160,90,0.12)' : 'rgba(46,160,90,0.07)', color: colors.green, border: `1px solid rgba(46,160,90,0.3)`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {geoState === 'loading' ? '⏳ Détection…' : geoState === 'done' ? '✅ Autour de moi' : '📍 Autour de moi'}
          </button>

          {/* Rayon */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: colors.textMid }}>
            <span>🔄 Rayon</span>
            <select value={radius} onChange={(e) => setRadius(e.target.value)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 7px', color: colors.text, fontSize: 11, outline: 'none' }}>
              <option>5 km</option><option>10 km</option><option>50 km</option><option>National</option>
            </select>
          </div>
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
