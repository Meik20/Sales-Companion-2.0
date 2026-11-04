'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * Bouton discret d'installation PWA
 * Visible uniquement lorsque le navigateur supporte l'installation et que l'app n'est pas déjà installée.
 */
export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { lang } = useTranslation()
  const isEn = lang === 'en'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Vérifier si déjà en mode standalone
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (isInstalled || !deferredPrompt) {
    return null
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      title={isEn ? 'Install Sales Companion app' : "Installer l'application Sales Companion"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-all duration-150 hover:bg-primary/20 active:scale-95"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}
    >
      <Download size={13} className="shrink-0 text-primary" />
      <span className={compact ? 'hidden md:inline' : 'inline'}>
        {isEn ? 'Install App' : "Installer l'app"}
      </span>
    </button>
  )
}

