'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  MessageSquare,
  Check
} from 'lucide-react'
import {
  getWhatsAppUrl,
  getWhatsAppSalesMessage,
  WHATSAPP_SALES_SCRIPTS,
  type WhatsAppScriptType
} from '@/utils/whatsapp'
import { useTranslation } from '@/providers/I18nProvider'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'

export interface WhatsAppActionMenuProps {
  phone?: string | null
  companyName: string
  contactName?: string | null
  countryCode?: string | null
  salespersonName?: string | null
  myCompanyName?: string | null
  size?: 'sm' | 'md'
  className?: string
}

export function WhatsAppActionMenu({
  phone,
  companyName,
  contactName,
  countryCode,
  salespersonName,
  myCompanyName,
  size = 'sm',
  className = ''
}: WhatsAppActionMenuProps) {
  const { lang, t } = useTranslation()
  const defaultCountry = useProspectingCountry()
  const effectiveCountry = countryCode || defaultCountry

  const [isOpen, setIsOpen] = useState(false)
  const [copiedScript, setCopiedScript] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!phone) {
    return (
      <span style={{ color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic', fontSize: 11 }}>
        {t('pipeline.notSpecified')}
      </span>
    )
  }

  const defaultMessage = getWhatsAppSalesMessage(
    'intro',
    { companyName, contactName, salespersonName, myCompanyName },
    lang as 'fr' | 'en'
  )

  const defaultUrl = getWhatsAppUrl(phone, defaultMessage, effectiveCountry)

  const handleOpenScript = (scriptType: WhatsAppScriptType) => {
    const text = getWhatsAppSalesMessage(
      scriptType,
      { companyName, contactName, salespersonName, myCompanyName },
      lang as 'fr' | 'en'
    )
    const url = getWhatsAppUrl(phone, text, effectiveCountry)
    window.open(url, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  const getScriptIcon = (id: WhatsAppScriptType) => {
    switch (id) {
      case 'intro':
        return <Sparkles size={14} className="text-emerald-400 shrink-0" />
      case 'quote':
        return <FileText size={14} className="text-blue-400 shrink-0" />
      case 'followup':
        return <Clock size={14} className="text-amber-400 shrink-0" />
      case 'stagnant':
        return <Send size={14} className="text-rose-400 shrink-0" />
    }
  }

  const isSmall = size === 'sm'

  return (
    <div ref={menuRef} className={`relative inline-flex items-center ${className}`} style={{ zIndex: isOpen ? 40 : 'auto' }}>
      {/* Bouton combiné WhatsApp */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 6,
          background: '#25D366',
          boxShadow: '0 1px 3px rgba(37, 211, 102, 0.35)',
          overflow: 'hidden'
        }}
      >
        <a
          href={defaultUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: isSmall ? '4px 8px' : '6px 10px',
            color: '#ffffff',
            fontSize: isSmall ? 11 : 12,
            fontWeight: 700,
            textDecoration: 'none',
            borderRight: '1px solid rgba(255,255,255,0.25)',
            transition: 'background-color 0.15s ease'
          }}
          title={lang === 'en' ? 'Direct WhatsApp chat' : 'Discussion WhatsApp directe'}
        >
          <MessageSquare size={isSmall ? 13 : 14} />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isSmall ? '4px 5px' : '6px 7px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          title={lang === 'en' ? 'Choose a sales script' : 'Choisir un script de vente'}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <ChevronDown
            size={isSmall ? 12 : 13}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease'
            }}
          />
        </button>
      </div>

      {/* Menu déroulant 100% OPAQUE des scripts de vente */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 290,
            backgroundColor: 'var(--card, #131c2e)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
            borderRadius: 10,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            padding: 8,
            zIndex: 50
          }}
          role="menu"
        >
          <div
            style={{
              padding: '4px 8px 8px',
              borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
              marginBottom: 6
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--foreground, #f1f5f9)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {lang === 'en' ? 'Sales Scripts' : 'Scripts de Vente'}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--muted-foreground, #94a3b8)',
                marginTop: 2
              }}
            >
              {lang === 'en'
                ? 'Pre-filled messages ready to send'
                : 'Messages pré-remplis prêts à envoyer'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {WHATSAPP_SALES_SCRIPTS.map((script) => {
              const label = lang === 'en' ? script.labelEn : script.labelFr
              const desc = lang === 'en' ? script.descriptionEn : script.descriptionFr

              return (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => handleOpenScript(script.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 6,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    color: 'var(--foreground, #f1f5f9)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--muted, rgba(255, 255, 255, 0.06))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  role="menuitem"
                >
                  <div style={{ marginTop: 2 }}>{getScriptIcon(script.id)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        lineHeight: 1.25,
                        color: 'var(--foreground, #f8fafc)'
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #94a3b8)',
                        marginTop: 2,
                        lineHeight: 1.3
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

