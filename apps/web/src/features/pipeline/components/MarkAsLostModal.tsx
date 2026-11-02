'use client'

import React, { useState } from 'react'
import {
  X,
  AlertCircle,
  FileText,
  Calendar,
  XCircle,
  Loader2
} from 'lucide-react'
import { LOSS_REASONS, type LossReasonId } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'

export interface MarkAsLostModalProps {
  open: boolean
  item: {
    id: string
    companyName: string
    amount?: number | null
    currency?: string | null
  } | null
  onClose: () => void
  onSuccess?: () => void
}

export function MarkAsLostModal({
  open,
  item,
  onClose,
  onSuccess
}: MarkAsLostModalProps) {
  const { lang, t } = useTranslation()
  const { pushToast } = useToast()
  const updateMutation = useUpdatePipelineItem()

  const [selectedReason, setSelectedReason] = useState<LossReasonId>('price_too_high')
  const [lossNotes, setLossNotes] = useState('')
  const [reactivationChoice, setReactivationChoice] = useState<'none' | '1m' | '3m' | '6m' | 'custom'>('none')
  const [customDate, setCustomDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open || !item) return null

  const isEn = lang === 'en'

  const computeReactivationDate = (): string | null => {
    if (reactivationChoice === 'none') return null
    if (reactivationChoice === 'custom') return customDate || null

    const d = new Date()
    if (reactivationChoice === '1m') d.setMonth(d.getMonth() + 1)
    if (reactivationChoice === '3m') d.setMonth(d.getMonth() + 3)
    if (reactivationChoice === '6m') d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const reactivationDate = computeReactivationDate()
      await updateMutation.mutateAsync({
        id: item.id,
        data: {
          status: 'perdue',
          lossReason: selectedReason,
          lossNotes: lossNotes.trim() || null,
          reactivationDate: reactivationDate || null,
          lostAt: new Date().toISOString()
        }
      })

      pushToast({
        type: 'success',
        title: isEn ? 'Deal marked as lost' : 'Affaire marquée comme perdue',
        description: isEn
          ? `Analysis data recorded for ${item.companyName}`
          : `Données d'échec enregistrées pour ${item.companyName}`
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('[MarkAsLostModal] Error:', err)
      pushToast({
        type: 'error',
        title: isEn ? 'Action failed' : 'Échec de la mise à jour',
        description: isEn ? 'Could not mark deal as lost' : 'Impossible de marquer l’affaire comme perdue'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.65)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: 'var(--card, #131c2e)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
          borderRadius: 14,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
            background: 'rgba(239, 68, 68, 0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <XCircle size={18} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--foreground, #f8fafc)',
                  margin: 0
                }}
              >
                {isEn ? 'Mark Deal as Lost' : 'Marquer comme affaire perdue'}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--muted-foreground, #94a3b8)',
                  margin: '2px 0 0 0'
                }}
              >
                {item.companyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-foreground, #94a3b8)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Information box */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: 'var(--foreground, #e2e8f0)',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'This will remove the deal from your active portfolio and enrich loss analytics for management.'
                : 'Cette action retire l’opportunité du portefeuille actif et alimente l’analyse d’échec managériale.'}
            </span>
          </div>

          {/* Motif d'échec (Obligatoire) */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--foreground, #f8fafc)',
                marginBottom: 6
              }}
            >
              {isEn ? 'Primary Reason for Loss *' : 'Motif principal d’échec *'}
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as LossReasonId)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--card, #131c2e)',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.16))',
                color: 'var(--foreground, #f8fafc)',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer'
              }}
              required
            >
              {LOSS_REASONS.map((r) => (
                <option key={r.id} value={r.id} style={{ background: '#131c2e', color: '#ffffff' }}>
                  {isEn ? r.labelEn : r.labelFr}
                </option>
              ))}
            </select>
          </div>

          {/* Notes détaillées / Feedback prospect (Optionnel) */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--foreground, #f8fafc)',
                marginBottom: 6
              }}
            >
              <FileText size={13} />
              <span>{isEn ? 'Prospect Feedback / Notes (Optional)' : 'Retours du prospect / Notes (Optionnel)'}</span>
            </label>
            <textarea
              rows={3}
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder={
                isEn
                  ? 'Details on objection, competitor offer, or future possibilities...'
                  : 'Détails sur l’objection formulée, le concurrent retenu ou les perspectives futures...'
              }
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--card, #131c2e)',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.16))',
                color: 'var(--foreground, #f8fafc)',
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Rappel de réactivation future */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--foreground, #f8fafc)',
                marginBottom: 6
              }}
            >
              <Calendar size={13} />
              <span>{isEn ? 'Schedule Reactivation Follow-up' : 'Prévoir une relance de réactivation'}</span>
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {[
                { id: 'none', labelFr: 'Aucun rappel', labelEn: 'No reminder' },
                { id: '1m', labelFr: 'Dans 1 mois', labelEn: 'In 1 month' },
                { id: '3m', labelFr: 'Dans 3 mois', labelEn: 'In 3 months' },
                { id: '6m', labelFr: 'Dans 6 mois', labelEn: 'In 6 months' },
                { id: 'custom', labelFr: 'Date libre', labelEn: 'Custom' }
              ].map((choice) => {
                const isSelected = reactivationChoice === choice.id
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setReactivationChoice(choice.id as any)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'var(--card, #131c2e)',
                      border: `1px solid ${isSelected ? '#6366f1' : 'var(--border, rgba(255,255,255,0.12))'}`,
                      color: isSelected ? '#a5b4fc' : 'var(--muted-foreground, #94a3b8)',
                      cursor: 'pointer'
                    }}
                  >
                    {isEn ? choice.labelEn : choice.labelFr}
                  </button>
                )
              })}
            </div>

            {reactivationChoice === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--card, #131c2e)',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.16))',
                  color: 'var(--foreground, #f8fafc)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))'
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </Button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#dc2626',
                border: 'none',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.4)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isEn ? 'Recording...' : 'Enregistrement...'}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  <span>{isEn ? 'Confirm Loss' : 'Confirmer la perte'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

