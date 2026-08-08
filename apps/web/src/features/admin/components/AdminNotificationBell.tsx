'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CreditCard, UserCheck, HeadphonesIcon, CheckCheck, X } from 'lucide-react'
import { useAdminNotifications } from '@/features/admin/hooks/useAdminNotifications'
import type { AdminNotification } from '@/features/admin/hooks/useAdminNotifications'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

const notifIcon: Record<AdminNotification['type'], React.ReactNode> = {
  payment_submitted: <CreditCard size={14} className="text-amber-400" />,
  new_manager: <UserCheck size={14} className="text-blue-400" />,
  support_ticket: <HeadphonesIcon size={14} className="text-violet-400" />
}

const notifBg: Record<AdminNotification['type'], string> = {
  payment_submitted: 'bg-amber-500/10',
  new_manager: 'bg-blue-500/10',
  support_ticket: 'bg-violet-500/10'
}

/**
 * Cloche de notifications temps réel pour l'admin.
 * Affichée uniquement dans l'AppHeader quand user.role === 'admin'.
 */
export function AdminNotificationBell() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [shake, setShake] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (unreadCount > prevCount && prevCount !== 0) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    setPrevCount(unreadCount)
  }, [unreadCount, prevCount])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  async function handleNotifClick(notif: AdminNotification) {
    if (!notif.read) await markAsRead(notif.id)
    if (notif.link) { setIsOpen(false); router.push(notif.link) }
  }

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
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      ` }} />

      <div ref={panelRef} className="relative">
        {/* Bell button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          title="Notifications admin"
          className={`relative flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] border border-white/18 text-white transition-colors duration-200 ${isOpen ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
          style={{ animation: shake ? 'bellShake 0.6s ease' : 'none' }}
        >
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex min-w-[17px] h-[17px] items-center justify-center rounded-full border-2 border-primary bg-red-500 px-1 text-[10px] font-bold text-white"
              style={{ animation: 'badgePop 300ms ease' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification panel */}
        {isOpen && (
          <div
            className="absolute right-0 top-[46px] z-[300] flex max-h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            style={{ animation: 'notifSlide 200ms ease' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-muted-foreground" />
                <span className="text-[14px] font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500/15 px-[7px] py-px text-[11px] font-bold text-red-400">
                    {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => void markAllAsRead()}
                    title="Tout marquer comme lu"
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <CheckCheck size={13} />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground/60">
                  <Bell size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="m-0">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => void handleNotifClick(notif)}
                    className={`flex items-start gap-3 border-b border-border px-4 py-3 transition-colors duration-150 ${
                      notif.read ? 'bg-transparent hover:bg-secondary' : `${notifBg[notif.type]} hover:bg-secondary`
                    } ${notif.link ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Type icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      {notifIcon[notif.type]}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] text-foreground ${notif.read ? 'font-medium' : 'font-bold'}`}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-red-500" />
                        )}
                      </div>
                      <p className="m-0 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                        {notif.message}
                      </p>
                      <span className="mt-1 block text-[11px] text-muted-foreground/60">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
