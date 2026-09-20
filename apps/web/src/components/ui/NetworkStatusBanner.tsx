'use client'

import React from 'react'
import { WifiOff, Wifi, CheckCircle2, X } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useTranslation } from '@/providers/I18nProvider'

export function NetworkStatusBanner() {
  const { isOnline, wasOffline, dismissReconnected } = useNetworkStatus()
  const { t } = useTranslation()

  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full z-50 transition-all duration-300 px-4 py-2 text-sm flex items-center justify-between shadow-md ${
        !isOnline
          ? 'bg-amber-600 text-white dark:bg-amber-700'
          : 'bg-blue-600 text-white dark:bg-blue-700 animate-in fade-in slide-in-from-top-2'
      }`}
    >
      <div className="flex items-center gap-2 mx-auto max-w-7xl font-medium">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse text-amber-200" />
            <span>{t('offline.banner')}</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-200" />
            <span>{t('offline.reconnected')}</span>
          </>
        )}
      </div>

      {isOnline && wasOffline && (
        <button
          onClick={dismissReconnected}
          aria-label="Fermer"
          className="p-1 rounded hover:bg-blue-700/50 text-blue-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
