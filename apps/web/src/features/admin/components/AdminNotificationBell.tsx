'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CreditCard, UserCheck, HeadphonesIcon, CheckCheck, X } from 'lucide-react'
import { colors } from '@/styles/tokens'
import { useAdminNotifications } from '@/features/admin/hooks/useAdminNotifications'
import type { AdminNotification } from '@/features/admin/hooks/useAdminNotifications'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  return `Il y a ${d}j`
}

const notifIcon: Record<AdminNotification['type'], React.ReactNode> = {
  payment_submitted: <CreditCard size={14} color="#f59e0b" />,
  new_manager: <UserCheck size={14} color="#3b82f6" />,
  support_ticket: <HeadphonesIcon size={14} color="#8b5cf6" />
}

const notifAccent: Record<AdminNotification['type'], string> = {
  payment_submitted: 'rgba(245,158,11,0.12)',
  new_manager: 'rgba(59,130,246,0.12)',
  support_ticket: 'rgba(139,92,246,0.12)'
}

/**
 * Cloche de notifications temps réel pour l'admin.
 * Affichée uniquement dans l'AppHeader quand user.role === 'admin'.
 * Les mises à jour arrivent via onSnapshot Firestore sans aucun polling.
 */
export function AdminNotificationBell() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(0)
  const [shake, setShake] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Animation de secousse quand une nouvelle notification arrive
  useEffect(() => {
    if (unreadCount > prevCount && prevCount !== 0) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    setPrevCount(unreadCount)
  }, [unreadCount, prevCount])

  // Fermer en cliquant à l'extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  async function handleNotifClick(notif: AdminNotification) {
    if (!notif.read) await markAsRead(notif.id)
    if (notif.link) {
      setIsOpen(false)
      router.push(notif.link)
    }
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

      <div ref={panelRef} style={{ position: 'relative' }}>
        {/* ── Bouton cloche ──────────────────────────────────────────── */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          title="Notifications admin"
          style={{
            position: 'relative',
            background: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'background 200ms ease',
            animation: shake ? 'bellShake 0.6s ease' : 'none'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)')}
        >
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#ef4444',
                color: '#fff',
                borderRadius: 9999,
                minWidth: 17,
                height: 17,
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                animation: 'badgePop 300ms ease',
                border: '2px solid var(--color-primary)'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Panneau de notifications ────────────────────────────────── */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 46,
              right: 0,
              width: 340,
              maxHeight: 480,
              background: colors.bg2,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 300,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'notifSlide 200ms ease'
            }}
          >
            {/* Header du panneau */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: `1px solid ${colors.border}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} style={{ color: colors.textMid }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      borderRadius: 9999,
                      padding: '1px 7px',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={() => void markAllAsRead()}
                    title="Tout marquer comme lu"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.textMid,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      transition: 'all 150ms'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg3)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <CheckCheck size={13} />
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.textMid,
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: colors.textDim,
                    fontSize: 13
                  }}
                >
                  <Bell size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => void handleNotifClick(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      background: notif.read ? 'transparent' : notifAccent[notif.type],
                      cursor: notif.link ? 'pointer' : 'default',
                      transition: 'background 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      if (notif.link) e.currentTarget.style.background = colors.bg3
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.read
                        ? 'transparent'
                        : notifAccent[notif.type]
                    }}
                  >
                    {/* Icône type */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: colors.bg3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {notifIcon[notif.type]}
                    </div>

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 2
                        }}
                      >
                        <span
                          style={{
                            fontWeight: notif.read ? 500 : 700,
                            fontSize: 13,
                            color: colors.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: '#ef4444',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: colors.textMid,
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {notif.message}
                      </p>
                      <span style={{ fontSize: 11, color: colors.textDim, marginTop: 4, display: 'block' }}>
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
