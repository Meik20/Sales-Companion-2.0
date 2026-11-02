'use client'

import React, { useState } from 'react'
import {
  Phone,
  MapPin,
  MessageSquare,
  Mail,
  FileText,
  Calendar,
  Send,
  Loader2,
  Clock,
  User,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import type { PipelineActivityType, PipelineActivityItem } from '@sales-companion/shared'
import {
  usePipelineActivities,
  useAddPipelineActivity
} from '@/features/pipeline/hooks/usePipelineActivities'
import { useTranslation } from '@/providers/I18nProvider'
import { useToast } from '@/hooks/useToast'

interface PipelineActivityTimelineProps {
  pipelineItemId: string
  companyName: string
}

const ACTIVITY_TYPES: {
  id: PipelineActivityType
  labelFr: string
  labelEn: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
  bgColor: string
}[] = [
  {
    id: 'call',
    labelFr: 'Appel',
    labelEn: 'Call',
    icon: Phone,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)'
  },
  {
    id: 'visit',
    labelFr: 'Visite terrain',
    labelEn: 'Field Visit',
    icon: MapPin,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)'
  },
  {
    id: 'whatsapp',
    labelFr: 'WhatsApp',
    labelEn: 'WhatsApp',
    icon: MessageSquare,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.12)'
  },
  {
    id: 'email',
    labelFr: 'Email',
    labelEn: 'Email',
    icon: Mail,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)'
  },
  {
    id: 'note',
    labelFr: 'Note interne',
    labelEn: 'Note',
    icon: FileText,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)'
  }
]

const COMMON_OUTCOMES: { id: string; labelFr: string; labelEn: string }[] = [
  { id: 'reached', labelFr: 'Échange positif / Intéressé', labelEn: 'Positive discussion' },
  { id: 'meeting_scheduled', labelFr: 'RDV fixé', labelEn: 'Meeting scheduled' },
  { id: 'quote_requested', labelFr: 'Devis demandé', labelEn: 'Quote requested' },
  { id: 'no_answer', labelFr: 'Sans réponse / Injoignable', labelEn: 'No answer' },
  { id: 'decision_maker_absent', labelFr: 'Décideur absent', labelEn: 'Decision-maker absent' }
]

export function PipelineActivityTimeline({
  pipelineItemId,
  companyName
}: PipelineActivityTimelineProps) {
  const { lang, t } = useTranslation()
  const { pushToast } = useToast()
  const isEn = lang === 'en'

  const { data: activities = [], isLoading } = usePipelineActivities(pipelineItemId)
  const addMutation = useAddPipelineActivity(pipelineItemId)

  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<PipelineActivityType>('call')
  const [summary, setSummary] = useState('')
  const [outcome, setOutcome] = useState<string>('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!summary.trim()) {
      pushToast({
        type: 'error',
        title: isEn ? 'Summary required' : 'Compte-rendu requis'
      })
      return
    }

    try {
      await addMutation.mutateAsync({
        type: selectedType,
        summary: summary.trim(),
        outcome: outcome.trim() || null,
        nextFollowUpDate: nextFollowUpDate.trim() || null
      })

      pushToast({
        type: 'success',
        title: isEn ? 'Activity logged' : 'Interaction enregistrée'
      })

      setSummary('')
      setOutcome('')
      setNextFollowUpDate('')
      setShowForm(false)
    } catch (err) {
      pushToast({
        type: 'error',
        title: isEn ? 'Error saving activity' : "Erreur d'enregistrement",
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
    }
  }

  const getTypeMeta = (type: PipelineActivityType) => {
    return ACTIVITY_TYPES.find((t) => t.id === type) || ACTIVITY_TYPES[0]!
  }

  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 14,
        padding: 18,
        marginTop: 18
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.14)',
              color: 'var(--primary, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Clock size={15} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--foreground, #f1f5f9)'
              }}
            >
              {isEn ? 'Activity Timeline & Field Log' : "Journal d'Activité & Historique Terrain"}
            </h4>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
              {activities.length}{' '}
              {activities.length > 1
                ? isEn
                  ? 'interactions recorded'
                  : 'interactions enregistrées'
                : isEn
                  ? 'interaction recorded'
                  : 'interaction enregistrée'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: showForm ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
            color: 'var(--primary, #818cf8)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 150ms ease'
          }}
        >
          {showForm ? <ChevronUp size={13} /> : <Plus size={13} />}
          <span>
            {showForm
              ? isEn
                ? 'Close form'
                : 'Fermer la saisie'
              : isEn
                ? '+ Log interaction'
                : '+ Noter une interaction'}
          </span>
        </button>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--secondary, #1e2a3b)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 12,
            padding: 16,
            marginBottom: 18
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted-foreground, #94a3b8)',
                marginBottom: 6
              }}
            >
              {isEn ? 'Interaction Type' : "Type d'interaction"}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ACTIVITY_TYPES.map((tMeta) => {
                const IconComponent = tMeta.icon
                const isSelected = selectedType === tMeta.id
                return (
                  <button
                    key={tMeta.id}
                    type="button"
                    onClick={() => setSelectedType(tMeta.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected
                        ? `1.5px solid ${tMeta.color}`
                        : '1px solid var(--border, rgba(255,255,255,0.08))',
                      background: isSelected ? tMeta.bgColor : 'transparent',
                      color: isSelected ? tMeta.color : 'var(--muted-foreground, #94a3b8)',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <IconComponent size={12} />
                    <span>{isEn ? tMeta.labelEn : tMeta.labelFr}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Outcome pills */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted-foreground, #94a3b8)',
                marginBottom: 6
              }}
            >
              {isEn ? 'Result / Outcome (optional)' : 'Résultat / Issue (optionnel)'}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COMMON_OUTCOMES.map((o) => {
                const isSelected = outcome === (isEn ? o.labelEn : o.labelFr)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setOutcome(isSelected ? '' : isEn ? o.labelEn : o.labelFr)
                    }
                    style={{
                      fontSize: 10.5,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: isSelected
                        ? '1px solid #10b981'
                        : '1px solid var(--border, rgba(255,255,255,0.08))',
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#10b981' : 'var(--muted-foreground, #94a3b8)',
                      cursor: 'pointer'
                    }}
                  >
                    {isEn ? o.labelEn : o.labelFr}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary / Notes */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted-foreground, #94a3b8)',
                marginBottom: 6
              }}
            >
              {isEn ? 'Interaction Details & Discussion' : 'Compte-rendu & Éléments discutés *'}
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                isEn
                  ? 'Key discussion points, objections raised, prospect needs...'
                  : 'Points abordés, objections soulevées, attentes du prospect...'
              }
              style={{
                width: '100%',
                background: 'var(--card, #131c2e)',
                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--foreground, #f1f5f9)',
                fontSize: 12.5,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Follow-up date + Submit */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={13} style={{ color: 'var(--muted-foreground, #94a3b8)' }} />
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                style={{
                  background: 'var(--card, #131c2e)',
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  borderRadius: 6,
                  padding: '4px 8px',
                  color: 'var(--foreground, #f1f5f9)',
                  fontSize: 11.5
                }}
                title={isEn ? 'Next follow-up date' : 'Date de prochaine relance'}
              />
              <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                {isEn ? 'Next follow-up' : 'Prochaine relance'}
              </span>
            </div>

            <button
              type="submit"
              disabled={addMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: addMutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
              }}
            >
              {addMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              <span>{isEn ? 'Save Interaction' : "Enregistrer l'interaction"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Timeline Stream */}
      {isLoading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted-foreground, #94a3b8)' }}>
          <Loader2 size={18} className="animate-spin mx-auto mb-2" />
          <span style={{ fontSize: 12 }}>{isEn ? 'Loading timeline...' : 'Chargement du journal...'}</span>
        </div>
      ) : activities.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '1px dashed var(--border, rgba(255,255,255,0.1))'
          }}
        >
          <Clock size={22} style={{ color: 'var(--muted-foreground, #64748b)', margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
            {isEn
              ? 'No interactions logged yet for this opportunity.'
              : "Aucune interaction enregistrée pour cette opportunité."}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
            {isEn
              ? 'Click "+ Log interaction" above to record a call, visit, or note.'
              : 'Cliquez sur "+ Noter une interaction" ci-dessus pour consigner un appel, une visite ou un échange.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activities.map((act) => {
            const meta = getTypeMeta(act.type)
            const Icon = meta.icon
            const formattedDate = new Date(act.createdAt).toLocaleString(isEn ? 'en-US' : 'fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

            return (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--secondary, #1e2a3b)',
                  border: '1px solid var(--border, rgba(255,255,255,0.06))'
                }}
              >
                {/* Type Icon Badge */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: meta.bgColor,
                    color: meta.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title={isEn ? meta.labelEn : meta.labelFr}
                >
                  <Icon size={15} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: meta.bgColor,
                          color: meta.color
                        }}
                      >
                        {isEn ? meta.labelEn : meta.labelFr}
                      </span>
                      {act.outcome && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          {act.outcome}
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
                        {act.performedByName}
                      </span>
                      {act.performedByRole && (
                        <span
                          style={{
                            fontSize: 9.5,
                            color: 'var(--muted-foreground, #64748b)',
                            textTransform: 'capitalize'
                          }}
                        >
                          ({act.performedByRole === 'team_manager' ? 'Team Manager' : act.performedByRole})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--muted-foreground, #64748b)' }}>
                      {formattedDate}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 12.5,
                      color: 'var(--foreground, #e2e8f0)',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {act.summary}
                  </p>

                  {act.nextFollowUpDate && (
                    <div
                      style={{
                        marginTop: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10.5,
                        color: '#f59e0b',
                        fontWeight: 600
                      }}
                    >
                      <Calendar size={10} />
                      <span>
                        {isEn ? 'Follow-up planned:' : 'Relance prévue :'}{' '}
                        {new Date(act.nextFollowUpDate).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

