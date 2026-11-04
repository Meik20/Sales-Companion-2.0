'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Smartphone,
  Apple,
  Monitor,
  Download,
  Share,
  PlusSquare,
  Check,
  X,
  QrCode,
  ShieldCheck,
  Sparkles,
  WifiOff
} from 'lucide-react'
import { ScIcon } from '@/components/ui/ScIcon'
import { useTranslation } from '@/providers/I18nProvider'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PlatformTab = 'android' | 'ios' | 'desktop'

const DISMISS_KEY = 'sc_app_install_modal_dismissed_until'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function detectPlatform(): PlatformTab {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  return 'desktop'
}

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true ||
    window.location.search.includes('source=pwa')
  )
}

/**
 * Fonction globale pour déclencher l'ouverture de la modale de téléchargement depuis n'importe où
 */
export function openAppInstallModal(platform?: PlatformTab) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('open-app-install-modal', {
      detail: { platform }
    })
  )
}

export function AppInstallModal() {
  const { lang } = useTranslation()
  const isEn = lang === 'en'

  const [isOpen, setIsOpen] = useState(false)
  const [showPromptBanner, setShowPromptBanner] = useState(false)
  const [activeTab, setActiveTab] = useState<PlatformTab>('android')
  const [detectedOS, setDetectedOS] = useState<PlatformTab>('desktop')
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [, startTransition] = useTransition()

  // Initialisation et détection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone = checkIsStandalone()
    setIsStandalone(standalone)

    const os = detectPlatform()
    setDetectedOS(os)
    setActiveTab(os)

    // Écoute de l'événement natif Android / Chrome
    const installPromptHandler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const appInstalledHandler = () => {
      setIsStandalone(true)
      setInstallSuccess(true)
      setDeferredPrompt(null)
    }

    // Écoute des ouvertures programmatiques (depuis boutons d'en-tête, hero, footer)
    const openModalHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ platform?: PlatformTab }>
      if (customEvent.detail?.platform) {
        setActiveTab(customEvent.detail.platform)
      } else {
        setActiveTab(detectPlatform())
      }
      setShowPromptBanner(false)
      setIsOpen(true)
    }

    window.addEventListener('beforeinstallprompt', installPromptHandler)
    window.addEventListener('appinstalled', appInstalledHandler)
    window.addEventListener('open-app-install-modal', openModalHandler)

    // Logique de proposition automatique (non intrusive) si non encore installée
    if (!standalone) {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY)
      const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now()

      if (!isDismissed) {
        // Déclencher après 10 secondes d'attention ou au premier scroll
        const timer = setTimeout(() => {
          startTransition(() => {
            setShowPromptBanner(true)
          })
        }, 10000)

        const scrollHandler = () => {
          if (window.scrollY > 400) {
            setShowPromptBanner(true)
            window.removeEventListener('scroll', scrollHandler)
          }
        }
        window.addEventListener('scroll', scrollHandler, { passive: true })

        return () => {
          clearTimeout(timer)
          window.removeEventListener('scroll', scrollHandler)
          window.removeEventListener('beforeinstallprompt', installPromptHandler)
          window.removeEventListener('appinstalled', appInstalledHandler)
          window.removeEventListener('open-app-install-modal', openModalHandler)
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', installPromptHandler)
      window.removeEventListener('appinstalled', appInstalledHandler)
      window.removeEventListener('open-app-install-modal', openModalHandler)
    }
  }, [])

  const handleDismissBanner = () => {
    setShowPromptBanner(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS))
    } catch {
      // Ignorer si localStorage désactivé
    }
  }

  const handleOpenFromBanner = () => {
    setShowPromptBanner(false)
    setIsOpen(true)
  }

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true)
        setDeferredPrompt(null)
      }
    } catch (err) {
      console.warn('Install prompt error:', err)
    }
  }

  // URL pour le QR Code desktop
  const qrTargetUrl = typeof window !== 'undefined' ? window.location.origin : 'https://salescompanion2-0.com'
  const qrApiUrl = `/api/qr?data=${encodeURIComponent(qrTargetUrl)}`

  return (
    <>
      {/* ── BANNIÈRE / NOTIFICATION FLOTTANTE D'INVITATION (NON INTRUSIVE) ── */}
      {showPromptBanner && !isOpen && !isStandalone && (
        <aside
          role="dialog"
          aria-label={isEn ? 'Install application notification' : "Proposition d'installation de l'application"}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 110,
            maxWidth: 380,
            width: 'calc(100vw - 40px)',
            backgroundColor: 'var(--card, #131c2e)',
            border: '1px solid rgba(27, 122, 62, 0.4)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
            opacity: 1
          }}
          className="animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(27, 122, 62, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(27, 122, 62, 0.25)'
              }}
            >
              <ScIcon size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--foreground, #ffffff)' }}>
                  Sales Companion 2.0
                </h4>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted-foreground, #94a3b8)',
                    cursor: 'pointer',
                    padding: 2
                  }}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                >
                  <X size={15} />
                </button>
              </div>

              <p style={{ margin: '4px 0 10px', fontSize: 11.5, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.4 }}>
                {isEn
                  ? 'Install the app on your device for instant offline access during field visits.'
                  : "Téléchargez l'application sur votre appareil pour prospecter même sans connexion."}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleOpenFromBanner}
                  style={{
                    backgroundColor: '#1B7A3E',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(27, 122, 62, 0.35)'
                  }}
                >
                  <Download size={13} />
                  <span>{isEn ? 'Download App' : "Télécharger l'app"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismissBanner}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--muted-foreground, #94a3b8)',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isEn ? 'Later' : 'Plus tard'}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── MODALE CENTRALE DE TÉLÉCHARGEMENT & INSTALLATION ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: 16,
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              // RÈGLE ARCHITECTURALE §8 : Opacité 100% absolue, pas de translucidité parasite
              backgroundColor: 'var(--card, #131c2e)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
              borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            className="animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header de la modale */}
            <div
              style={{
                padding: '20px 22px 16px',
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(27, 122, 62, 0.15)',
                    border: '1px solid rgba(27, 122, 62, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <ScIcon size={28} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--foreground, #ffffff)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span>Sales Companion <span style={{ color: '#1B7A3E' }}>2.0</span></span>
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                    {isEn ? 'Download & Install Field Application' : "Télécharger & Installer l'Application Terrain"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'var(--secondary, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border, rgba(255,255,255,0.08))',
                  borderRadius: 8,
                  padding: 6,
                  color: 'var(--muted-foreground, #94a3b8)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={isEn ? 'Close modal' : 'Fermer la modale'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Onglets Système (Android / iOS / Desktop) avec détection automatique */}
            <div
              style={{
                display: 'flex',
                padding: '10px 16px',
                gap: 6,
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))'
              }}
            >
              {[
                { id: 'android' as const, label: 'Android', icon: Smartphone, tag: detectedOS === 'android' ? (isEn ? 'Detected' : 'Votre appareil') : null },
                { id: 'ios' as const, label: 'iPhone / iPad', icon: Apple, tag: detectedOS === 'ios' ? (isEn ? 'Detected' : 'Votre appareil') : null },
                { id: 'desktop' as const, label: isEn ? 'Computer' : 'Ordinateur', icon: Monitor, tag: detectedOS === 'desktop' ? (isEn ? 'Detected' : 'Votre appareil') : null }
              ].map((tab) => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 6px',
                      borderRadius: 10,
                      border: isActive ? '1px solid rgba(27, 122, 62, 0.45)' : '1px solid transparent',
                      backgroundColor: isActive ? 'rgba(27, 122, 62, 0.15)' : 'transparent',
                      color: isActive ? 'var(--foreground, #ffffff)' : 'var(--muted-foreground, #94a3b8)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TabIcon size={15} style={{ color: isActive ? '#1B7A3E' : 'currentColor' }} />
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
                    </div>
                    {tab.tag && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#1B7A3E',
                          marginTop: 2,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {tab.tag}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Corps de la modale selon l'onglet actif */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ── ONGLET ANDROID ── */}
              {activeTab === 'android' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: 'rgba(27, 122, 62, 0.08)',
                      border: '1px solid rgba(27, 122, 62, 0.25)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10
                    }}
                  >
                    <Sparkles size={18} style={{ color: '#1B7A3E', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: 'var(--foreground, #ffffff)', lineHeight: 1.45 }}>
                      <strong>{isEn ? 'Instant 1-tap install' : 'Installation directe en 1 clic'}</strong>
                      <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground, #94a3b8)', fontSize: 11.5 }}>
                        {isEn
                          ? 'No app store required. Works 100% offline with full database sync.'
                          : 'Aucun Play Store requis. Fonctionne 100% hors-ligne avec synchronisation automatique.'}
                      </p>
                    </div>
                  </div>

                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handleNativeInstall}
                      style={{
                        backgroundColor: '#1B7A3E',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 12,
                        padding: '12px 18px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(27, 122, 62, 0.4)',
                        transition: 'transform 100ms ease'
                      }}
                    >
                      <Download size={16} />
                      <span>{isEn ? 'Install App on this Android Device' : "Installer l'application sur cet appareil Android"}</span>
                    </button>
                  )}

                  {installSuccess ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#10b981',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Check size={16} />
                      <span>{isEn ? 'App successfully installed on your device!' : 'Application installée avec succès sur votre appareil !'}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground, #94a3b8)', textTransform: 'uppercase' }}>
                        {isEn ? 'How to install manually from Chrome / Edge:' : 'Instructions d’installation depuis Chrome / Edge :'}
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          {
                            step: '1',
                            text: isEn
                              ? 'Tap the three dots menu (⋮) at the top right of your browser.'
                              : 'Appuyez sur le menu (⋮) en haut à droite de votre navigateur.'
                          },
                          {
                            step: '2',
                            text: isEn
                              ? 'Select "Install app" or "Add to Home screen".'
                              : 'Sélectionnez « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
                          },
                          {
                            step: '3',
                            text: isEn
                              ? 'Confirm by tapping "Install". The Sales Companion 2.0 icon is now on your home screen.'
                              : 'Confirmez en appuyant sur « Installer ». L’icône officielle s’ajoute immédiatement à votre écran d’accueil.'
                          }
                        ].map((s) => (
                          <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(27, 122, 62, 0.2)',
                                color: '#1B7A3E',
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {s.step}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--foreground, #ffffff)', lineHeight: 1.45 }}>
                              {s.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ONGLET IPHONE / IPAD (IOS) ── */}
              {activeTab === 'ios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: 'rgba(27, 122, 62, 0.08)',
                      border: '1px solid rgba(27, 122, 62, 0.25)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10
                    }}
                  >
                    <Apple size={18} style={{ color: '#1B7A3E', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: 'var(--foreground, #ffffff)', lineHeight: 1.45 }}>
                      <strong>{isEn ? 'Install on iPhone & iPad via Safari' : 'Installation sur iPhone & iPad via Safari'}</strong>
                      <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground, #94a3b8)', fontSize: 11.5 }}>
                        {isEn
                          ? 'Directly from Safari, no Apple App Store account needed.'
                          : 'Directement depuis Safari, sans passer par l’App Store.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      {
                        step: '1',
                        icon: Share,
                        title: isEn ? 'Tap the Share icon' : 'Appuyez sur Partager',
                        desc: isEn
                          ? 'In Safari, tap the Share icon (square with arrow pointing up) at the bottom of your screen.'
                          : 'Dans Safari, appuyez sur l’icône Partager (carré avec flèche vers le haut) en bas de l’écran.'
                      },
                      {
                        step: '2',
                        icon: PlusSquare,
                        title: isEn ? 'Add to Home Screen' : 'Sur l’écran d’accueil',
                        desc: isEn
                          ? 'Scroll down the options list and tap "Add to Home Screen".'
                          : 'Faites défiler le menu et touchez « Sur l’écran d’accueil ».'
                      },
                      {
                        step: '3',
                        icon: Check,
                        title: isEn ? 'Confirm Add' : 'Confirmez l’Ajout',
                        desc: isEn
                          ? 'Tap "Add" at the top right. Sales Companion 2.0 is now on your phone like a native app.'
                          : 'Touchez « Ajouter » en haut à droite. L’icône apparaît sur votre écran d’accueil et s’ouvre en plein écran.'
                      }
                    ].map((stepItem) => {
                      const StepIcon = stepItem.icon
                      return (
                        <div
                          key={stepItem.step}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border, rgba(255,255,255,0.08))',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: 'rgba(27, 122, 62, 0.15)',
                              color: '#1B7A3E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <StepIcon size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--foreground, #ffffff)' }}>
                              {stepItem.step}. {stepItem.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #94a3b8)', marginTop: 2, lineHeight: 1.4 }}>
                              {stepItem.desc}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── ONGLET ORDINATEUR (DESKTOP) ── */}
              {activeTab === 'desktop' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border, rgba(255,255,255,0.08))',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B7A3E', fontWeight: 700, fontSize: 12 }}>
                      <QrCode size={16} />
                      <span>{isEn ? 'Scan to install on your smartphone' : 'Scannez pour installer sur votre smartphone'}</span>
                    </div>

                    <div
                      style={{
                        padding: 10,
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                        display: 'inline-block'
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrApiUrl}
                        alt="QR Code d'installation mobile"
                        width={140}
                        height={140}
                        style={{ display: 'block' }}
                      />
                    </div>

                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground, #94a3b8)', maxWidth: 360, lineHeight: 1.45 }}>
                      {isEn
                        ? 'Point your phone camera at this QR code to open and install Sales Companion on Android or iPhone.'
                        : 'Pointez l’appareil photo de votre smartphone vers ce code pour ouvrir et installer Sales Companion sur Android ou iPhone.'}
                    </p>
                  </div>

                  {deferredPrompt && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                        {isEn ? 'Or install as a desktop application on this PC/Mac:' : 'Ou installez comme application de bureau sur cet ordinateur :'}
                      </span>
                      <button
                        type="button"
                        onClick={handleNativeInstall}
                        style={{
                          backgroundColor: 'var(--secondary, rgba(255,255,255,0.08))',
                          color: 'var(--foreground, #ffffff)',
                          border: '1px solid var(--border, rgba(255,255,255,0.15))',
                          borderRadius: 10,
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Download size={14} />
                        <span>{isEn ? 'Install Desktop App' : "Installer l'application bureau"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Réassurance & Avantages hors-ligne */}
              <div
                style={{
                  borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
                  paddingTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                    <WifiOff size={13} style={{ color: '#1B7A3E' }} />
                    <span>{isEn ? '100% Offline' : 'Mode 100% hors-ligne'}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                    <ShieldCheck size={13} style={{ color: '#1B7A3E' }} />
                    <span>{isEn ? 'Encrypted & Secure' : 'Sécurisé & Certifié'}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted-foreground, #94a3b8)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isEn ? 'Close' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
