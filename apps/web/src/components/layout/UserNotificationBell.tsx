'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Target,
  ArrowRightLeft,
  Clock,
  Check,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Users,
  Award,
  Info
} from 'lucide-react'
import { useUserNotifications, type UserNotification } from '@/features/notifications/hooks/useUserNotifications'
import { useTranslation } from '@/providers/I18nProvider'

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getNotifIcon(type: UserNotification['type'], size = 15) {
  switch (type) {
    case 'prospect_assignment':
      return <Target size={size} className="text-blue-500 shrink-0" />
    case 'prospect_transfer':
      return <ArrowRightLeft size={size} className="text-emerald-500 shrink-0" />
    case 'deadline_reminder':
      return <Clock size={size} className="text-amber-500 shrink-0" />
    default:
      return <Bell size={size} className="text-primary shrink-0" />
  }
}

function getIconBg(type: UserNotification['type']): string {
  switch (type) {
    case 'prospect_assignment': return 'rgba(37,99,235,0.10)'
    case 'prospect_transfer': return 'rgba(16,185,129,0.10)'
    case 'deadline_reminder': return 'rgba(245,158,11,0.10)'
    default: return 'var(--secondary)'
  }
}

function getCtaLabel(notif: UserNotification, lang: string): string {
  const link = notif.link ?? ''
  if (link.includes('/team')) return lang === 'en' ? 'View My Team' : 'Voir mon équipe'
  if (link.includes('/pipeline')) return lang === 'en' ? 'View Pipeline' : 'Voir le Pipeline'
  if (link.includes('/reporting')) return lang === 'en' ? 'View Reports' : 'Voir les rapports'
  if (link.includes('/import')) return lang === 'en' ? 'View Imports' : 'Voir les imports'
  if (link.includes('/clients')) return lang === 'en' ? 'View Clients' : 'Voir les clients'
  if (link.includes('/dashboard')) return lang === 'en' ? 'View Dashboard' : 'Voir le tableau de bord'
  if (link.includes('/support')) return lang === 'en' ? 'View Support' : 'Voir le support'
  if (link.includes('/upgrade')) return lang === 'en' ? 'Upgrade Plan' : 'Mettre à niveau'
  return lang === 'en' ? 'View Details' : 'Voir les détails'
}

function formatDateFull(isoStr: string, lang: string): string {
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
}

function formatDateShort(isoStr: string, lang: string): string {
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return ''
    const diffMs = Date.now() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 2) return lang === 'en' ? 'Just now' : '\u00c0 l\u2019instant'
    if (diffMin < 60) return `${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH} h`
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' })
  } catch { return '' }
}

// ─── Composant principal ─────────────────────────────────────────────────────────

export function UserNotificationBell() {
  const router = useRouter()
  const { lang } = useTranslation()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [shake, setShake] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<UserNotification | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (unreadCount > prevCount && prevCount !== 0) {
      setShake(true)
      const timer = setTimeout(() => setShake(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevCount(unreadCount)
  }, [unreadCount, prevCount])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSelectedNotif(null)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setSelectedNotif(null)
  }, [isOpen])

  async function handleNotificationClick(notif: UserNotification) {
    if (!notif.read) await markAsRead(notif.id)
    setSelectedNotif(notif)
  }

  function handleCtaClick(notif: UserNotification) {
    setIsOpen(false)
    setSelectedNotif(null)
    if (notif.link) router.push(notif.link)
  }

  // ── Vue de détail ─────────────────────────────────────────────────────────────
  function renderDetailView(notif: UserNotification) {
    return (
      <div style={{ animation: 'detailSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }} className="flex flex-col h-full">

        {/* Header retour */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 shrink-0"
          style={{ backgroundColor: 'var(--secondary, #f8fafc)' }}>
          <button type="button" onClick={() => setSelectedNotif(null)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md px-1.5 py-1 hover:bg-secondary"
            aria-label={lang === 'en' ? 'Back to notifications' : 'Retour aux notifications'}>
            <ArrowLeft size={13} />
            <span>{lang === 'en' ? 'Notifications' : 'Notifications'}</span>
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ backgroundColor: 'var(--card, #ffffff)' }}>

          {/* Icône + titre + date */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border"
              style={{ backgroundColor: getIconBg(notif.type) }}>
              {getNotifIcon(notif.type, 22)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-foreground leading-snug">{notif.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {formatDateFull(notif.createdAt, lang)}
              </p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-border/60 mb-4" />

          {/* Message intégral */}
          <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
            {notif.message}
          </p>

          {/* Métadonnées contextuelles */}
          {(notif.metadata?.deadline || notif.metadata?.senderName || notif.metadata?.count) && (
            <div className="mt-4 flex flex-col gap-2">
              {notif.metadata.deadline && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <Clock size={13} className="text-amber-500 shrink-0" />
                  <span className="text-[12px] font-semibold text-amber-600">
                    {lang === 'en' ? 'Deadline: ' : '\u00c9ch\u00e9ance\u00a0: '}
                    {new Date(notif.metadata.deadline as string).toLocaleDateString(
                      lang === 'en' ? 'en-US' : 'fr-FR',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </span>
                </div>
              )}
              {notif.metadata.senderName && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-secondary border border-border px-3 py-2">
                  <Users size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-[12px] font-medium text-foreground/70">
                    {lang === 'en' ? 'From\u00a0' : 'De\u00a0'}
                    <span className="font-semibold text-foreground">{String(notif.metadata.senderName)}</span>
                  </span>
                </div>
              )}
              {notif.metadata.count && Number(notif.metadata.count) > 0 && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <span className="text-[12px] font-semibold text-blue-600">
                    {lang === 'en'
                      ? `${notif.metadata.count} opportunity(ies) concerned`
                      : `${notif.metadata.count} opportunit\u00e9(s) concern\u00e9e(s)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Badge type */}
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">
              {notif.type === 'prospect_assignment' && <><Target size={10} />{lang === 'en' ? 'Assignment' : 'Assignation'}</>}
              {notif.type === 'prospect_transfer' && <><ArrowRightLeft size={10} />{lang === 'en' ? 'Transfer' : 'Transfert'}</>}
              {notif.type === 'deadline_reminder' && <><Clock size={10} />{lang === 'en' ? 'Deadline' : '\u00c9ch\u00e9ance'}</>}
              {notif.type === 'general' && <><Award size={10} />{lang === 'en' ? 'General' : 'G\u00e9n\u00e9ral'}</>}
            </span>
          </div>
        </div>

        {/* Footer CTA */}
        {notif.link && (
          <div className="shrink-0 border-t border-border px-3 py-2.5"
            style={{ backgroundColor: 'var(--secondary, #f8fafc)' }}>
            <button type="button" onClick={() => handleCtaClick(notif)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
              <ExternalLink size={13} />
              <span>{getCtaLabel(notif, lang)}</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Vue liste ─────────────────────────────────────────────────────────────────
  function renderListView() {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0"
          style={{ backgroundColor: 'var(--secondary, #f8fafc)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-foreground">
              {lang === 'en' ? 'Notifications' : 'Notifications'}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {unreadCount} {lang === 'en' ? 'new' : 'nouvelle(s)'}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllAsRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer">
              <Check size={12} />
              <span>{lang === 'en' ? 'Mark all as read' : 'Tout marquer comme lu'}</span>
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60"
          style={{ maxHeight: 380, backgroundColor: 'var(--card, #ffffff)' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground mb-2">
                <Bell size={18} className="opacity-40" />
              </div>
              <p className="text-[12px] text-muted-foreground font-medium">
                {lang === 'en' ? 'No notifications yet' : 'Aucune notification pour le moment'}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} onClick={() => handleNotificationClick(notif)}
                role="button" aria-label={notif.title}
                className="flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-secondary/40"
                style={{ backgroundColor: !notif.read ? 'rgba(37, 99, 235, 0.06)' : 'var(--card, #ffffff)' }}>

                {/* Icône + point non-lu */}
                <div className="relative mt-0.5 shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border"
                    style={{ backgroundColor: getIconBg(notif.type) }}>
                    {getNotifIcon(notif.type)}
                  </div>
                  {!notif.read && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-[12px] truncate ${!notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {formatDateShort(notif.createdAt, lang)}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2">
                    {notif.message}
                  </p>
                  {notif.metadata?.deadline && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-500 border border-amber-500/20">
                      <Clock size={11} />
                      <span>
                        {lang === 'en' ? 'Deadline: ' : '\u00c9ch\u00e9ance\u00a0: '}
                        {new Date(notif.metadata.deadline as string).toLocaleDateString(
                          lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' }
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight size={14} className="text-muted-foreground/50 self-center shrink-0" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="shrink-0 border-t border-border px-3 py-2 text-center"
            style={{ backgroundColor: 'var(--secondary, #f8fafc)' }}>
            <button type="button"
              onClick={() => { setIsOpen(false); router.push('/pipeline') }}
              className="w-full py-1.5 rounded-lg text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              {lang === 'en' ? 'Open Sales Pipeline' : 'Acc\u00e9der au Sales Pipeline'}
            </button>
          </div>
        )}
      </>
    )
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bellShake {
          0%,100% { transform: rotate(0); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes detailSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      ` }} />

      <div ref={panelRef} className="relative">
        {/* Bouton Cloche */}
        <button type="button" onClick={() => setIsOpen((v) => !v)}
          title={lang === 'en' ? 'Notifications' : 'Notifications'}
          className={`relative flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-border text-foreground transition-colors duration-200 ${isOpen ? 'bg-secondary' : 'bg-secondary/60 hover:bg-secondary'}`}
          style={{ animation: shake ? 'bellShake 0.6s ease' : 'none' }}>
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -top-[5px] -right-[5px] flex min-w-[19px] h-[19px] items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-500 px-[5px] text-[10px] font-extrabold text-white shadow-[0_2px_8px_rgba(239,68,68,0.5)] border-2 border-background"
              style={{ animation: 'badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panneau déroulant */}
        {isOpen && (
          <>
            <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-[490]" aria-hidden="true" />
            <div
              className="absolute right-0 top-[48px] z-[500] flex w-[370px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
              style={{
                backgroundColor: 'var(--card, #ffffff)',
                boxShadow: '0 20px 45px -10px rgba(0,0,0,0.28), 0 0 0 1px var(--border, rgba(0,0,0,0.1))',
                animation: 'notifSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                maxHeight: '520px'
              }}>
              {selectedNotif ? renderDetailView(selectedNotif) : renderListView()}
            </div>
          </>
        )}
      </div>
    </>
  )
}
