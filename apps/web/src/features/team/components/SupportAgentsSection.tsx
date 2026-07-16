'use client'

import { useSupportAgents, SupportAgent } from '../hooks/useSupportAgents'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { Mail, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/index'

export function SupportAgentsSection() {
  const { data: agents, isLoading, isError } = useSupportAgents()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SectionCard title="Agents Support" subtitle="Chargement…">
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          {t('team.loading')}
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title="Agents Support" subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          {t('support.errorLoad')}
        </div>
      </SectionCard>
    )
  }

  const activeAgents = agents?.filter((a) => a.active) || []

  return (
    <SectionCard
      title="Agents Support"
      subtitle={`${activeAgents.length} agent(s) actif(s)`}
    >
      {activeAgents.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: colors.textMid,
            padding: 20,
            fontSize: 13
          }}
        >
          Aucun agent de support actif dans votre équipe.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeAgents.map((agent) => (
            <AgentCard key={agent.uid} agent={agent} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function AgentCard({ agent }: { agent: SupportAgent }) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 200ms ease',
        flexWrap: 'wrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(235,133,18,0.1)',
            color: '#eb8512',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            flexShrink: 0,
            border: '1px solid rgba(235,133,18,0.2)'
          }}
        >
          {agent.name[0]?.toUpperCase() || 'A'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {agent.name}
            <Badge
              variant="default"
              style={{
                background: 'rgba(235,133,18,0.1)',
                color: '#eb8512',
                border: '1px solid rgba(235,133,18,0.2)',
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 6px'
              }}
            >
              SUPPORT
            </Badge>
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.textMid,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Mail size={12} style={{ opacity: 0.6 }} />
            {agent.email}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        {/* Info Message instead of quota */}
        <div style={{ fontSize: 12, color: colors.textDim, fontWeight: 500, textAlign: 'right' }}>
          Aucune limite de recherche
        </div>

        {/* Status Section */}
        <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
          <Badge
            variant={agent.active ? 'success' : 'default'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 700
            }}
          >
            {agent.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {agent.active ? t('team.active').toUpperCase() : t('team.inactive').toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  )
}
