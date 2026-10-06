'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import {
  Users2,
  Mail,
  Phone,
  Crown,
  User2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react'
import { useOrgPipeline, type OrgManagerStats } from '@/features/pipeline/hooks/useOrgPipeline'

interface OrgManager {
  uid: string
  name: string
  email: string
  phone?: string | null
  orgRole: string
  isCurrent: boolean
  isSenior: boolean
  createdAt?: string | null
}

interface OrgManagersSectionProps {
  managers: OrgManager[]
  orgCode: string
}

/** Affiche les stats pipeline d'un manager en les croisant avec l'org pipeline query */
function ManagerStatsRow({ manager, stats }: { manager: OrgManager; stats?: OrgManagerStats['stats'] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8
      }}
    >
      {[
        { label: 'Prospection', value: stats?.prospection ?? '—', color: '#60a5fa' },
        { label: 'Négociation', value: stats?.negociation ?? '—', color: '#fbbf24' },
        { label: 'Conclus', value: stats?.conclue ?? '—', color: '#34d399' },
        { label: 'Total', value: stats?.total ?? '—', color: '#a78bfa' }
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: 'var(--background)',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function ManagerCard({
  manager,
  orgStats
}: {
  manager: OrgManager
  orgStats?: OrgManagerStats
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: manager.isCurrent
          ? '1px solid var(--primary, #6366f1)'
          : '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s'
      }}
    >
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left'
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: manager.isSenior ? 'var(--primary, #6366f1)' : 'var(--secondary, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {manager.isSenior ? (
            <Crown size={18} color="#fff" />
          ) : (
            <User2 size={18} color="var(--muted-foreground)" />
          )}
        </div>

        {/* Infos principales */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--foreground)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {manager.name || manager.email}
            </span>
            {manager.isSenior && (
              <Badge variant="info">Senior Manager</Badge>
            )}
            {!manager.isSenior && (
              <Badge variant="default">Team Manager</Badge>
            )}
            {manager.isCurrent && (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                (vous)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
            {manager.email}
          </div>
        </div>

        {/* Compteur total pipeline */}
        {orgStats && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa', fontFamily: "'Syne',sans-serif" }}>
              {orgStats.stats.total}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>prospects</div>
          </div>
        )}

        {/* Chevron */}
        <div style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Détails expandus */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          {/* Contact */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
              <Mail size={13} />
              <span>{manager.email}</span>
            </div>
            {manager.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
                <Phone size={13} />
                <span>{manager.phone}</span>
              </div>
            )}
            {manager.createdAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted-foreground)' }}>
                <Calendar size={13} />
                <span>Depuis le {new Date(manager.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>

          {/* Stats pipeline */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Pipeline de ce manager
            </div>
            <ManagerStatsRow manager={manager} stats={orgStats?.stats} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Section affichée dans la page Équipe pour le Senior Manager.
 * Liste tous les managers de l'organisation avec leurs stats pipeline.
 */
export function OrgManagersSection({ managers, orgCode }: OrgManagersSectionProps) {
  // Récupère les stats pipeline de tous les managers de l'org
  const orgPipelineQuery = useOrgPipeline()

  if (!managers || managers.length === 0) return null

  // Construire un index uid → OrgManagerStats depuis l'org pipeline
  const statsByUid: Record<string, OrgManagerStats> = {}
  if (orgPipelineQuery.data?.managers) {
    for (const mgr of orgPipelineQuery.data.managers) {
      statsByUid[mgr.uid] = mgr
    }
  }

  const seniorManagers = managers.filter((m) => m.isSenior)
  const teamManagers = managers.filter((m) => !m.isSenior)

  // Compteurs globaux issus du pipeline org
  const orgCounts = orgPipelineQuery.data?.counts

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI résumé */}
      {orgCounts && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            padding: '14px 16px',
            background: 'var(--card, #131c2e)',
            border: '1px solid var(--border)',
            borderRadius: 12
          }}
        >
          {[
            { label: 'Managers', value: managers.length, color: '#a78bfa', icon: <Users2 size={14} /> },
            { label: 'Prospection', value: orgCounts.prospection, color: '#60a5fa', icon: <TrendingUp size={14} /> },
            { label: 'Négociation', value: orgCounts.negociation, color: '#fbbf24', icon: <Filter size={14} /> },
            { label: 'Conclus', value: orgCounts.conclue, color: '#34d399', icon: <CheckCircle2 size={14} /> }
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                {icon} {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Senior Managers */}
      {seniorManagers.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Crown size={12} /> Senior Manager{seniorManagers.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {seniorManagers.map((mgr) => (
              <ManagerCard key={mgr.uid} manager={mgr} orgStats={statsByUid[mgr.uid]} />
            ))}
          </div>
        </div>
      )}

      {/* Team Managers */}
      {teamManagers.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users2 size={12} /> Team Manager{teamManagers.length > 1 ? 's' : ''} ({teamManagers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamManagers.map((mgr) => (
              <ManagerCard key={mgr.uid} manager={mgr} orgStats={statsByUid[mgr.uid]} />
            ))}
          </div>
        </div>
      )}

      {/* Message si seul dans l'org */}
      {managers.length === 1 && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: 'var(--secondary)',
            fontSize: 13,
            color: 'var(--muted-foreground)',
            textAlign: 'center'
          }}
        >
          Vous êtes le seul manager de votre organisation pour l'instant.<br />
          Partagez votre code ORG dans les paramètres pour inviter d'autres managers.
        </div>
      )}
    </div>
  )
}
