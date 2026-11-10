'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Navigation,
  MapPin,
  Route,
  Calendar,
  User,
  Clock,
  ExternalLink,
  X,
  Building2,
  CheckCircle2,
  Compass,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { Button } from '@/components/ui/Button'
import { formatCompactAmount } from '@/lib/formatters'

export interface VisitLocationData {
  latitude: number
  longitude: number
  accuracy?: number | null
  address?: string | null
  visitedAt?: string | null
}

export interface VisitedPipelineItem {
  id: string
  companyName: string
  status: string
  amount?: number | null
  currency?: string | null
  assignedTo?: string | null
  memberName?: string | null
  companyCity?: string | null
  companyQuarter?: string | null
  quarter?: string | null
  companySector?: string | null
  lastVisitLocation?: VisitLocationData | null
  updatedAt?: any
}

interface FieldVisitsDrawerProps {
  open: boolean
  onClose: () => void
  items: VisitedPipelineItem[]
  members?: { uid: string; name?: string; email?: string }[]
  isOrgView?: boolean
  currency?: string
}

function formatDateKey(dateStr?: string | null): string {
  if (!dateStr) return 'unknown'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'unknown'
    return d.toISOString().slice(0, 10)
  } catch {
    return 'unknown'
  }
}

function formatDisplayDate(dateKey: string, lang: string): string {
  if (dateKey === 'unknown') return lang === 'en' ? 'Undated' : 'Non daté'
  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (dateKey === today) return lang === 'en' ? 'Today' : "Aujourd'hui"
    if (dateKey === yesterday) return lang === 'en' ? 'Yesterday' : 'Hier'
    const [y, m, d] = dateKey.split('-')
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
    return dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return dateKey
  }
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '--:--'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '--:--'
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

export function FieldVisitsDrawer({
  open,
  onClose,
  items,
  members = [],
  isOrgView = false,
  currency = 'XAF'
}: FieldVisitsDrawerProps) {
  const { lang, t } = useTranslation()
  const isEn = lang === 'en'
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'week'>('all')

  // Fermer avec la touche Echap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Filtrer les opportunités ayant un check-in GPS enregistré
  const visitedLeads = useMemo(() => {
    return items
      .filter((i) => {
        const loc = i.lastVisitLocation
        return Boolean(loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number')
      })
      .map((item) => {
        const member = members.find((m) => m.uid === item.assignedTo)
        const memberLabel = item.memberName || member?.name || member?.email || (isEn ? 'Field Sales' : 'Commercial terrain')
        const visitedDate = item.lastVisitLocation?.visitedAt || item.updatedAt
        return {
          ...item,
          memberLabel,
          visitedDateStr: typeof visitedDate === 'string' ? visitedDate : (visitedDate?.toDate?.()?.toISOString() ?? new Date().toISOString())
        }
      })
      .sort((a, b) => new Date(b.visitedDateStr).getTime() - new Date(a.visitedDateStr).getTime())
  }, [items, members, isEn])

  // Filtrage selon le commercial et la période
  const filteredVisits = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

    return visitedLeads.filter((v) => {
      // Filtre commercial
      if (selectedMember !== 'all' && v.assignedTo !== selectedMember) {
        return false
      }
      // Filtre période
      const dateKey = formatDateKey(v.visitedDateStr)
      if (selectedDateFilter === 'today' && dateKey !== todayStr) {
        return false
      }
      if (selectedDateFilter === 'week' && dateKey < sevenDaysAgo) {
        return false
      }
      return true
    })
  }, [visitedLeads, selectedMember, selectedDateFilter])

  // Groupement par jour pour affichage chronologique des tournées
  const visitsByDay = useMemo(() => {
    const map = new Map<string, typeof filteredVisits>()
    for (const v of filteredVisits) {
      const day = formatDateKey(v.visitedDateStr)
      const list = map.get(day) || []
      list.push(v)
      map.set(day, list)
    }
    return Array.from(map.entries()).map(([day, visits]) => ({
      day,
      dayLabel: formatDisplayDate(day, lang),
      // Inverser pour avoir l'ordre chronologique de la journée (du matin au soir)
      visits: [...visits].reverse()
    }))
  }, [filteredVisits, lang])

  // Statistiques de la sélection
  const stats = useMemo(() => {
    const uniqueMembers = new Set(filteredVisits.map((v) => v.assignedTo).filter(Boolean))
    const accuracies = filteredVisits
      .map((v) => v.lastVisitLocation?.accuracy)
      .filter((a): a is number => typeof a === 'number' && a > 0)
    const avgAccuracy = accuracies.length > 0 ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : null

    return {
      totalVisits: filteredVisits.length,
      activeMembersCount: uniqueMembers.size,
      avgAccuracy
    }
  }, [filteredVisits])

  if (!open) return null

  return (
    <>
      {/* ── Backdrop sombre ──────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(5, 10, 20, 0.65)',
          backdropFilter: 'blur(5px)',
          transition: 'opacity 200ms ease'
        }}
        aria-hidden="true"
      />

      {/* ── Drawer Slide-over ────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-visits-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1101,
          width: '100%',
          maxWidth: 640,
          height: '100%',
          maxHeight: '100vh',
          background: 'var(--card, #131c2e)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.1))',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ── En-tête du Drawer ──────────────────────────────────────────── */}
        <div
          className="p-3.5 sm:p-5"
          style={{
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(5,150,105,0.04) 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  boxShadow: '0 2px 10px rgba(16,185,129,0.25)',
                  flexShrink: 0
                }}
              >
                <Route size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2
                    id="field-visits-title"
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--foreground, #0f172a)',
                      fontFamily: "'Syne', sans-serif"
                    }}
                  >
                    {isEn ? 'Field Tours & GPS Visits' : 'Tournées & Visites GPS'}
                  </h2>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(16,185,129,0.12)',
                      color: '#059669',
                      border: '1px solid rgba(16,185,129,0.3)'
                    }}
                  >
                    {stats.totalVisits} {isEn ? 'check-ins' : 'visites certifiées'}
                  </span>
                </div>
                <p className="hidden sm:block" style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--muted-foreground, #64748b)' }}>
                  {isEn
                    ? 'Certified on-site GPS check-ins and field routes sequence'
                    : 'Suivi des check-ins GPS certifiés sur site et itinéraire des tournées'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, rgba(255,255,255,0.05))',
                color: 'var(--muted-foreground, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
                flexShrink: 0
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Contenu Scrollable ─────────────────────────────────────────── */}
        <div
          className="p-3.5 sm:p-5"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overscrollBehavior: 'contain'
          }}
        >
          {/* 1. Synthèse des 3 Métriques Clés */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8
            }}
          >
            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 10,
                padding: '9px 12px'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase' }}>
                {isEn ? 'Certified Visits' : 'Visites Certifiées'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                {stats.totalVisits}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 10,
                padding: '9px 12px'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase' }}>
                {isEn ? 'Field Sales' : 'Commerciaux Terrain'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>
                {stats.activeMembersCount}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 10,
                padding: '9px 12px'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase' }}>
                {isEn ? 'GPS Accuracy' : 'Précision GPS'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>
                {stats.avgAccuracy != null ? `±${stats.avgAccuracy}m` : '--'}
              </div>
            </div>
          </div>

          {/* 2. Filtres par Commercial et par Période */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {members.length > 0 && (
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(0,0,0,0.12))',
                  background: 'var(--card, #ffffff)',
                  color: 'var(--foreground, #0f172a)',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  flex: 1,
                  minWidth: 160
                }}
              >
                <option value="all">{isEn ? 'All team members' : "Toute l'équipe"}</option>
                {members.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedDateFilter === 'all' ? '1px solid #10b981' : '1px solid var(--border, rgba(0,0,0,0.1))',
                  background: selectedDateFilter === 'all' ? 'rgba(16,185,129,0.15)' : 'var(--card, #ffffff)',
                  color: selectedDateFilter === 'all' ? '#059669' : 'var(--foreground, #0f172a)'
                }}
              >
                {isEn ? 'All' : 'Toutes'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('today')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedDateFilter === 'today' ? '1px solid #10b981' : '1px solid var(--border, rgba(0,0,0,0.1))',
                  background: selectedDateFilter === 'today' ? 'rgba(16,185,129,0.15)' : 'var(--card, #ffffff)',
                  color: selectedDateFilter === 'today' ? '#059669' : 'var(--foreground, #0f172a)'
                }}
              >
                {isEn ? 'Today' : "Aujourd'hui"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('week')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedDateFilter === 'week' ? '1px solid #10b981' : '1px solid var(--border, rgba(0,0,0,0.1))',
                  background: selectedDateFilter === 'week' ? 'rgba(16,185,129,0.15)' : 'var(--card, #ffffff)',
                  color: selectedDateFilter === 'week' ? '#059669' : 'var(--foreground, #0f172a)'
                }}
              >
                {isEn ? '7 days' : '7 jours'}
              </button>
            </div>
          </div>

          {/* 3. Liste Chronologique des Tournées Journalières */}
          {visitsByDay.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '1px dashed var(--border, rgba(255,255,255,0.1))'
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}
              >
                <Compass size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground)' }}>
                {isEn ? 'No certified visits yet' : 'Aucune visite GPS certifiée'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, maxWidth: 360, marginInline: 'auto', lineHeight: 1.5 }}>
                {isEn
                  ? 'Certified visits will appear here as soon as your field sales reps click "GPS Check-in" when logging on-site visits.'
                  : 'Les visites apparaîtront ici dès que vos commerciaux valident le bouton "Check-in GPS" lors de leurs visites terrain.'}
              </p>
            </div>
          ) : (
            visitsByDay.map(({ day, dayLabel, visits }) => {
              // Génération du lien itinéraire multi-étapes Google Maps
              const googleMapsRouteUrl =
                visits.length >= 2
                  ? `https://www.google.com/maps/dir/${visits
                      .map((v) => `${v.lastVisitLocation!.latitude},${v.lastVisitLocation!.longitude}`)
                      .join('/')}`
                  : visits.length === 1
                    ? `https://www.google.com/maps?q=${visits[0]!.lastVisitLocation!.latitude},${visits[0]!.lastVisitLocation!.longitude}`
                    : null

              return (
                <div
                  key={day}
                  style={{
                    background: 'var(--secondary, rgba(255,255,255,0.03))',
                    borderRadius: 12,
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    overflow: 'hidden'
                  }}
                >
                  {/* En-tête du Jour & Bouton Itinéraire Google Maps */}
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(16,185,129,0.08)',
                      borderBottom: '1px solid var(--border, rgba(0,0,0,0.06))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground, #0f172a)', textTransform: 'capitalize' }}>
                        {dayLabel}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: 'rgba(16,185,129,0.15)',
                          color: '#059669'
                        }}
                      >
                        {visits.length} {visits.length > 1 ? (isEn ? 'stops' : 'étapes') : isEn ? 'stop' : 'étape'}
                      </span>
                    </div>

                    {googleMapsRouteUrl && (
                      <a
                        href={googleMapsRouteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                          transition: 'all 150ms ease'
                        }}
                      >
                        <Navigation size={11} />
                        <span>{visits.length >= 2 ? (isEn ? 'View Tour on Maps' : 'Voir le parcours sur Maps') : isEn ? 'View on Maps' : 'Voir sur Maps'}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {/* Séquence des Étapes de la Tournée */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visits.map((v, idx) => {
                      const loc = v.lastVisitLocation!
                      const singleMapUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`

                      return (
                        <div
                          key={v.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '9px 12px',
                            background: 'var(--card, #ffffff)',
                            borderRadius: 10,
                            border: '1px solid var(--border, rgba(0,0,0,0.06))',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Numéro de l'étape */}
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'rgba(16,185,129,0.15)',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                              flexShrink: 0,
                              marginTop: 2
                            }}
                          >
                            {idx + 1}
                          </div>

                          {/* Détails de la visite */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: 'var(--foreground, #0f172a)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {v.companyName}
                              </h4>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: 'var(--muted-foreground, #64748b)'
                                }}
                              >
                                <Clock size={11} />
                                {formatTime(v.visitedDateStr)}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  color: 'var(--muted-foreground, #64748b)'
                                }}
                              >
                                <User size={11} />
                                <strong>{v.memberLabel}</strong>
                              </span>

                              {(v.companyQuarter || v.quarter || v.companyCity) && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 11,
                                    color: 'var(--muted-foreground, #64748b)'
                                  }}
                                >
                                  <MapPin size={10} />
                                  {[v.companyQuarter || v.quarter, v.companyCity].filter(Boolean).join(', ')}
                                </span>
                              )}

                              {loc.accuracy && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'rgba(16,185,129,0.1)',
                                    color: '#059669',
                                    fontWeight: 700
                                  }}
                                >
                                  ±{loc.accuracy}m
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bouton Voir point sur carte */}
                          <a
                            href={singleMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={isEn ? 'Open pin in Google Maps' : 'Ouvrir ce point dans Google Maps'}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              background: 'var(--secondary, rgba(0,0,0,0.05))',
                              border: '1px solid var(--border, rgba(0,0,0,0.1))',
                              color: 'var(--muted-foreground, #64748b)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              textDecoration: 'none'
                            }}
                          >
                            <MapPin size={13} />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'var(--card, #131c2e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            {isEn ? 'Total recorded visits:' : 'Total visites enregistrées :'} <strong>{visitedLeads.length}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} style={{ fontSize: 12 }}>
            {isEn ? 'Close' : 'Fermer'}
          </Button>
        </div>
      </div>
    </>
  )
}

