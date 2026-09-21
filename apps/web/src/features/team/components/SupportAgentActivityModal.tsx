'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Phone,
  Ticket,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { SupportAgent } from '../hooks/useSupportAgents'

type Props = {
  agent: SupportAgent
  onClose: () => void
}

type ActivityData = {
  agent: {
    uid: string
    name: string
    email: string
    accessId: string
  }
  kpis: {
    callsCount: number
    ticketsCount: number
    resolvedTicketsCount: number
    openTicketsCount: number
    crmActivitiesCount: number
    resolutionRate: number
  }
  recentCalls: Array<{
    id: string
    clientId: string
    clientName: string
    clientPhone: string
    status: string
    notes: string
    createdAt: string
  }>
  recentTickets: Array<{
    id: string
    clientId: string
    clientName: string
    subject: string
    description: string
    priority: string
    status: string
    createdAt: string
  }>
  recentCrmActivities: Array<{
    id: string
    clientId: string
    type: string
    title: string
    description: string
    createdAt: string
  }>
}

export function SupportAgentActivityModal({ agent, onClose }: Props) {
  const { user } = useCurrentUser()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ActivityData | null>(null)
  const [activeTab, setActiveTab] = useState<'calls' | 'tickets' | 'crm'>('calls')

  const fetchActivity = useCallback(async () => {
    if (!user || !agent.uid) return
    setLoading(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/team/support-agents/${agent.uid}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Impossible de charger l'activité de cet agent")
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, agent.uid])

  useEffect(() => {
    void fetchActivity()
  }, [fetchActivity])

  const CALL_STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    connected:  { label: 'Décroché',    color: '#3b82f6', emoji: '🔵' },
    no_answer:  { label: 'Non joint',   color: '#f59e0b', emoji: '📵' },
    busy:       { label: 'Occupé',      color: '#f97316', emoji: '🔴' },
    voicemail:  { label: 'Répondeur',   color: '#a78bfa', emoji: '📬' },
    failed:     { label: 'Échec',       color: '#f87171', emoji: '❌' }
  }

  const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    open:        { label: 'Ouvert',    color: '#f87171' },
    in_progress: { label: 'En cours',  color: '#f59e0b' },
    resolved:    { label: 'Résolu',    color: '#0284c7' },
    closed:      { label: 'Fermé',     color: '#94a3b8' }
  }

  const handleOpenReporting = () => {
    onClose()
    router.push(`/reporting?tab=support&agentUid=${agent.uid}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eb8512]/15 text-[#eb8512] font-bold text-base border border-[#eb8512]/20">
                {agent.name[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-foreground truncate">
                    {agent.name}
                  </h3>
                  <span className="rounded-full border border-[#eb8512]/20 bg-[#eb8512]/10 px-2 py-0.5 text-[10px] font-bold text-[#eb8512]">
                    SUPPORT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.email} {agent.accessId ? `· ID: ${agent.accessId}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-xs">Chargement des activités de l'agent…</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-500">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : data ? (
              <>
                {/* Mini KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3 flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Phone size={11} className="text-blue-400" /> Appels
                    </span>
                    <span className="text-xl font-black text-blue-400 mt-1">
                      {data.kpis.callsCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground">appels enregistrés</span>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Ticket size={11} className="text-amber-400" /> Tickets
                    </span>
                    <span className="text-xl font-black text-amber-400 mt-1">
                      {data.kpis.ticketsCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground">tickets SAV pris en charge</span>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-400" /> Résolus
                    </span>
                    <span className="text-xl font-black text-emerald-400 mt-1">
                      {data.kpis.resolutionRate}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">{data.kpis.resolvedTicketsCount} tickets clôturés</span>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText size={11} className="text-purple-400" /> CRM
                    </span>
                    <span className="text-xl font-black text-purple-400 mt-1">
                      {data.kpis.crmActivitiesCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground">notes & actions CRM</span>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-border gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('calls')}
                    className={`pb-2.5 px-3 transition-colors border-b-2 cursor-pointer ${
                      activeTab === 'calls'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📞 Appels ({data.recentCalls.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`pb-2.5 px-3 transition-colors border-b-2 cursor-pointer ${
                      activeTab === 'tickets'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🎫 Tickets SAV ({data.recentTickets.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('crm')}
                    className={`pb-2.5 px-3 transition-colors border-b-2 cursor-pointer ${
                      activeTab === 'crm'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📝 Activités CRM ({data.recentCrmActivities.length})
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {/* Calls Tab */}
                  {activeTab === 'calls' && (
                    <>
                      {data.recentCalls.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">
                          Aucun appel enregistré pour cet agent.
                        </p>
                      ) : (
                        data.recentCalls.map((call) => {
                          const statusInfo = CALL_STATUS_LABELS[call.status] || {
                            label: call.status,
                            color: '#94a3b8',
                            emoji: '📞'
                          }
                          return (
                            <div
                              key={call.id}
                              className="rounded-xl border border-border bg-secondary/15 p-3 flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-foreground">
                                  {call.clientName || 'Client'}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(call.createdAt).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: `${statusInfo.color}20`,
                                    color: statusInfo.color
                                  }}
                                >
                                  {statusInfo.emoji} {statusInfo.label}
                                </span>
                                {call.clientPhone && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {call.clientPhone}
                                  </span>
                                )}
                              </div>
                              {call.notes && (
                                <p className="text-xs text-muted-foreground bg-black/15 p-2 rounded-lg mt-0.5">
                                  {call.notes}
                                </p>
                              )}
                            </div>
                          )
                        })
                      )}
                    </>
                  )}

                  {/* Tickets Tab */}
                  {activeTab === 'tickets' && (
                    <>
                      {data.recentTickets.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">
                          Aucun ticket SAV enregistré pour cet agent.
                        </p>
                      ) : (
                        data.recentTickets.map((ticket) => {
                          const statusInfo = TICKET_STATUS_LABELS[ticket.status] || {
                            label: ticket.status,
                            color: '#94a3b8'
                          }
                          return (
                            <div
                              key={ticket.id}
                              className="rounded-xl border border-border bg-secondary/15 p-3 flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-foreground">
                                  {ticket.clientName || 'Client'}
                                </span>
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: `${statusInfo.color}20`,
                                    color: statusInfo.color
                                  }}
                                >
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-foreground">
                                {ticket.subject}
                              </div>
                              {ticket.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {ticket.description}
                                </p>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </>
                  )}

                  {/* CRM Tab */}
                  {activeTab === 'crm' && (
                    <>
                      {data.recentCrmActivities.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">
                          Aucune note ou action CRM directe pour cet agent.
                        </p>
                      ) : (
                        data.recentCrmActivities.map((act) => (
                          <div
                            key={act.id}
                            className="rounded-xl border border-border bg-secondary/15 p-3 flex flex-col gap-1"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-foreground">
                                {act.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(act.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {act.description && (
                              <p className="text-xs text-muted-foreground">
                                {act.description}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/20">
            <button
              onClick={handleOpenReporting}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <span>Voir dans le tableau de bord complet</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
