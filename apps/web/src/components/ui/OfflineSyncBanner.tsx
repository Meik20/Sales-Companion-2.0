'use client'

import React from 'react'
import { WifiOff, RefreshCw, CheckCircle2, Cloud, AlertCircle } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useTranslation } from '@/providers/I18nProvider'

export function OfflineSyncBanner() {
  const { lang } = useTranslation()
  const isEn = lang === 'en'
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    wasOffline
  } = useNetworkStatus()

  // Si en ligne et aucune mutation en attente et pas récemment hors ligne, ne rien afficher
  if (isOnline && pendingCount === 0 && !wasOffline) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '92vw',
        pointerEvents: 'auto',
        animation: 'fadeIn 200ms ease'
      }}
    >
      {!isOnline ? (
        // État : Hors ligne
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 20,
            background: '#b45309',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(180, 83, 9, 0.4)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '-0.01em'
          }}
        >
          <WifiOff size={15} style={{ flexShrink: 0 }} />
          <span>
            {isEn ? 'Offline Mode' : 'Mode Hors-Ligne'} —{' '}
            {isEn
              ? 'Field actions saved locally'
              : 'Vos saisies terrain sont conservées localement'}
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                fontSize: 10.5,
                background: 'rgba(255,255,255,0.22)',
                padding: '1px 6px',
                borderRadius: 10,
                fontWeight: 800
              }}
            >
              {pendingCount} {isEn ? 'pending' : 'en attente'}
            </span>
          )}
        </div>
      ) : pendingCount > 0 ? (
        // État : En ligne avec actions en attente de synchronisation
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 20,
            background: '#1e293b',
            border: '1px solid #4f46e5',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
            fontSize: 12,
            fontWeight: 600
          }}
        >
          <Cloud size={15} style={{ color: '#818cf8', flexShrink: 0 }} />
          <span>
            <strong>{pendingCount}</strong>{' '}
            {pendingCount > 1
              ? isEn
                ? 'actions pending sync'
                : 'actions en attente de synchronisation'
              : isEn
                ? 'action pending sync'
                : 'action en attente de synchronisation'}
          </span>
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 12,
              background: '#4f46e5',
              border: 'none',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? (isEn ? 'Syncing...' : 'Sync...') : isEn ? 'Sync now' : 'Synchroniser'}</span>
          </button>
        </div>
      ) : (
        // État : Reconnecté avec succès
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 14px',
            borderRadius: 20,
            background: '#047857',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(4, 120, 87, 0.35)',
            fontSize: 12,
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>
            {isEn
              ? 'Connection restored · Everything up to date'
              : 'Connexion rétablie · Données à jour'}
          </span>
        </div>
      )}
    </div>
  )
}

