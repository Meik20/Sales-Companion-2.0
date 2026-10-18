'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Target, ArrowRightLeft, Clock, Check, ChevronRight } from 'lucide-react'
import { useUserNotifications, type UserNotification } from '@/features/notifications/hooks/useUserNotifications'
import { useTranslation } from '@/providers/I18nProvider'

export function UserNotificationBell() {
  const router = useRouter()
  const { t, lang } = useTranslation()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [shake, setShake] = useState(false)
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
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  async function handleNotificationClick(notif: UserNotification) {
    if (!notif.read) {
      await markAsRead(notif.id)
    }
    setIsOpen(false)
    if (notif.link) {
      router.push(notif.link)
    }
  }

  function getIcon(type: UserNotification['type']) {
    switch (type) {
      case 'prospect_assignment':
        return <Target size={15} className="text-blue-500 shrink-0" />
      case 'prospect_transfer':
        return <ArrowRightLeft size={15} className="text-emerald-500 shrink-0" />
      case 'deadline_reminder':
        return <Clock size={15} className="text-amber-500 shrink-0" />
      default:
        return <Bell size={15} className="text-primary shrink-0" />
    }
  }

  function formatDate(isoStr: string) {
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return ''
      const diffMs = Date.now() - d.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 2) return lang === 'en' ? 'Just now' : 'À l’instant'
      if (diffMin < 60) return `${diffMin} min`
      const diffH = Math.floor(diffMin / 60)
      if (diffH < 24) return `${diffH} h`
      return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
        day: 'numeric',
        month: 'short'
      })
    } catch {
      return ''
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `
        }}
      />

      <div ref={panelRef} className="relative">
        {/* Bouton Cloche */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          title={lang === 'en' ? 'Notifications' : 'Notifications'}
          className={`relative flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-border text-foreground transition-colors duration-200 ${
            isOpen ? 'bg-secondary' : 'bg-secondary/60 hover:bg-secondary'
          }`}
          style={{ animation: shake ? 'bellShake 0.6s ease' : 'none' }}
        >
          <Bell size={17} strokeWidth={2} />

          {/* Pastille compteur unread */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-[5px] -right-[5px] flex min-w-[19px] h-[19px] items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-500 px-[5px] text-[10px] font-extrabold text-white shadow-[0_2px_8px_rgba(239,68,68,0.5)] border-2 border-background"
              style={{ animation: 'badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panneau déroulant */}
        {isOpen && (
          <div
            className="absolute right-0 top-[48px] z-[200] flex w-[340px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-border/80 bg-popover/95 shadow-elevation-3 backdrop-blur-md"
            style={{ animation: 'notifSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Header du panneau */}
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-card/60">
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
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Check size={12} />
                  <span>{lang === 'en' ? 'Mark all as read' : 'Tout marquer comme lu'}</span>
                </button>
              )}
            </div>

            {/* Liste des notifications */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
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
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${
                      !notif.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/40'
                    }`}
                  >
                    {/* Icône du type */}
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/80 border border-border/60">
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-[12px] truncate ${
                            !notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2">
                        {notif.message}
                      </p>

                      {notif.metadata?.deadline && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-500 border border-amber-500/20">
                          <Clock size={11} />
                          <span>
                            {lang === 'en' ? 'Deadline: ' : 'Échéance : '}
                            {new Date(notif.metadata.deadline as string).toLocaleDateString(
                              lang === 'en' ? 'en-US' : 'fr-FR',
                              { day: 'numeric', month: 'short' }
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

            {/* Pied du panneau */}
            {notifications.length > 0 && (
              <div className="border-t border-border/80 px-3 py-2 bg-card/40 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/pipeline')
                  }}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {lang === 'en' ? 'Open Sales Pipeline' : 'Accéder au Sales Pipeline'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
