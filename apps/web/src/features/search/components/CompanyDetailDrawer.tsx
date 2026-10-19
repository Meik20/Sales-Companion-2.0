'use client'

import { useEffect } from 'react'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { useTranslation } from '@/providers/I18nProvider'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { COUNTRY_TAX_LABELS } from '@sales-companion/shared'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import { AddToPipelineButton } from './AddToPipelineButton'
import { SaveCompanyButton } from './SaveCompanyButton'
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  ShieldCheck,
  Globe,
  FileText,
  DollarSign,
  Briefcase
} from 'lucide-react'

type Props = {
  company: Company | null
  onClose: () => void
}

const EXCLUDE_KEYS = new Set([
  'id',
  'raisonSociale',
  'name',
  'sigle',
  'sector',
  'region',
  'city',
  'telephone',
  'email',
  'dirigeant',
  'niu',
  'rccm',
  'adresse',
  'capital',
  'formeJuridique',
  'importedBy',
  'createdAt',
  'updatedAt',
  'verified',
  'activite_principale',
  'centre_de_rattachement',
  'ville',
  'raison_sociale',
  'Secteur d activite',
  'Responsable',
  'Responsable/Propriétaire',
  'Telephone',
  'Email',
  'Site Web',
  'Description',
  'Localisation',
  'RAISON SOCIALE',
  'SECTEUR D ACTIVITE',
  'RESPONSABLE',
  'secteur d activite',
  "Secteur d'activité",
  "Secteur d'activite",
  "SECTEUR D'ACTIVITE",
  'Secteur',
  'SECTEUR',
  'secteur',
  'country',
  'Country',
  'pays',
  'Pays',
  '_searchScore',
  '_source'
])

function formatLabel(key: string, t: any): string {
  const trans = t(`field.${key}`)
  if (trans !== `field.${key}`) return trans
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export function CompanyDetailDrawer({ company, onClose }: Props) {
  const { t } = useTranslation()
  const prospectingCountry = useProspectingCountry()
  const taxLabel = COUNTRY_TAX_LABELS[prospectingCountry] || 'NIU'

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (company) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [company, onClose])

  if (!company) return null

  const name = String(company.raisonSociale || company.name || 'Entreprise')
  const initial = name.charAt(0).toUpperCase() || 'E'
  const sector = String(company.sector || '').trim()

  const extraFields = Object.entries(company).filter(([key, val]) => {
    const normalized = key.trim()
    return (
      !EXCLUDE_KEYS.has(normalized) &&
      !EXCLUDE_KEYS.has(normalized.toUpperCase()) &&
      val &&
      String(val).trim()
    )
  })

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop sombre */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Drawer 480px — STRICTEMENT 100% OPAQUE (Règle 8 AGENTS.md) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="relative z-10 flex h-full w-[480px] max-w-[92vw] flex-col border-l border-border bg-card text-foreground shadow-2xl"
        style={{
          backgroundColor: 'var(--card)',
          opacity: 1,
          animation: 'drawerSlideLeft 200ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes drawerSlideLeft {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `
          }}
        />

        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-border/80 px-6 py-5 bg-card">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-base shadow-2xs">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground leading-snug">
                  {name}
                </h2>
                {company.verified !== false && (
                  <span title="Entreprise Vérifiée" className="inline-flex items-center shrink-0">
                    <ShieldCheck
                      size={16}
                      className="shrink-0 text-primary fill-primary/15"
                    />
                  </span>
                )}
              </div>
              {sector && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {sector}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 border-b border-border/80 px-6 py-3 bg-secondary/30">
          <div className="flex-1">
            <AddToPipelineButton company={company} />
          </div>
          <SaveCompanyButton company={company} iconOnly={true} />
          {company.telephone && (
            <>
              <a
                href={`tel:${company.telephone}`}
                className="h-8 w-8 rounded-lg border border-border/80 bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-all shadow-2xs"
                title={`Appeler ${company.telephone}`}
              >
                <Phone size={14} />
              </a>
              <a
                href={getWhatsAppUrl(
                  String(company.telephone),
                  `Bonjour, je vous contacte au sujet de ${name}.`
                )}
                target="_blank"
                rel="noreferrer"
                className="h-8 w-8 rounded-lg border border-border/80 bg-card hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 flex items-center justify-center text-muted-foreground transition-all shadow-2xs"
                title="WhatsApp"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
              </a>
            </>
          )}
        </div>

        {/* Drawer Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: Contacts */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t('field.contacts' as any) || 'Contacts & Coordonnées'}
            </h3>
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 space-y-3">
              {company.telephone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={15} className="text-primary shrink-0" />
                  <a
                    href={`tel:${company.telephone}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {String(company.telephone)}
                  </a>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={15} className="text-primary shrink-0" />
                  <a
                    href={`mailto:${company.email}`}
                    className="font-medium text-foreground hover:text-primary transition-colors truncate"
                  >
                    {String(company.email)}
                  </a>
                </div>
              )}
              {(company.city || company.region) && (
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <MapPin size={15} className="text-muted-foreground shrink-0" />
                  <span>
                    {String(company.city || '')}
                    {company.region ? ` · ${String(company.region)}` : ''}
                  </span>
                </div>
              )}
              {company.adresse && (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Building2 size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                  <span>{String(company.adresse)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Identité Légale */}
          {(company.niu || company.rccm || company.capital || company.formeJuridique) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('field.legalIdentity' as any) || 'Identité Légale'}
              </h3>
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 divide-y divide-border/60">
                {company.formeJuridique && (
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-muted-foreground">{t('field.formeJuridique') || 'Forme juridique'}</span>
                    <span className="font-semibold text-foreground">{String(company.formeJuridique)}</span>
                  </div>
                )}
                {company.niu && (
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-muted-foreground">{taxLabel}</span>
                    <span className="font-mono font-semibold text-foreground">{String(company.niu)}</span>
                  </div>
                )}
                {company.rccm && (
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-muted-foreground">{t('field.rccm')}</span>
                    <span className="font-mono font-semibold text-foreground">{String(company.rccm)}</span>
                  </div>
                )}
                {company.capital && (
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-muted-foreground">{t('field.capital')}</span>
                    <span className="font-semibold text-foreground">{String(company.capital)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Dirigeant */}
          {company.dirigeant && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('field.leadership' as any) || 'Direction'}
              </h3>
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('field.dirigeant') || 'Responsable'}</div>
                  <div className="text-sm font-semibold text-foreground">{String(company.dirigeant)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Attributs complémentaires */}
          {extraFields.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('field.additionalDetails' as any) || 'Informations complémentaires'}
              </h3>
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 space-y-2.5">
                {extraFields.map(([k, val]) => (
                  <div key={k} className="flex justify-between text-xs gap-3">
                    <span className="text-muted-foreground shrink-0">{formatLabel(k, t)}:</span>
                    <span className="font-medium text-foreground text-right">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
