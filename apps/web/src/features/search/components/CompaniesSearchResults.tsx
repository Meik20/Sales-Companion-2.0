'use client'

import { useState } from 'react'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { useTranslation } from '@/providers/I18nProvider'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import { AddToPipelineButton } from './AddToPipelineButton'
import { SaveCompanyButton } from './SaveCompanyButton'
import { CompanyDetailDrawer } from './CompanyDetailDrawer'
import { Phone, Mail, MapPin, Check, ShieldCheck } from 'lucide-react'

type Props = { items: Company[] }

const AVATAR_PALETTE = [
  'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25',
  'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  'bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25',
  'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25'
]

function getAvatarStyle(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[index]!
}

function getSectorChipClass(sector: string): string {
  const s = sector.toLowerCase()
  if (s.includes('btp') || s.includes('construction')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }
  if (s.includes('tech') || s.includes('numérique')) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  }
  if (s.includes('agri') || s.includes('agro')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  }
  if (s.includes('transport') || s.includes('logistique')) {
    return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
  }
  if (s.includes('santé') || s.includes('medical')) {
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }
  if (s.includes('commerce') || s.includes('vente')) {
    return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
  }
  return 'bg-primary/10 text-primary border-primary/20'
}

export function CompanyCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card min-h-[88px] animate-pulse w-full min-w-0 box-border">
      {/* Zone gauche avatar */}
      <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary/80" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 sm:w-36 rounded bg-secondary/80" />
            <div className="h-4 w-16 sm:w-20 rounded-full bg-secondary/60" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-24 rounded bg-secondary/60" />
            <div className="h-3.5 w-28 rounded bg-secondary/60" />
          </div>
        </div>
      </div>
      {/* Zone droite actions */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
        <div className="h-8 w-8 rounded-lg bg-secondary/70 shrink-0" />
        <div className="h-8 w-8 rounded-lg bg-secondary/70 shrink-0" />
        <div className="h-8 w-8 rounded-lg bg-secondary/70 shrink-0" />
        <div className="h-8 w-24 rounded-lg bg-secondary/80 shrink-0" />
      </div>
    </div>
  )
}

export function CompaniesSearchResults({ items }: Props) {
  const { t } = useTranslation()
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  if (!items.length) return null

  return (
    <>
      <div className="flex flex-col gap-2 w-full min-w-0">
        {items.map((company) => {
          const name = String(company.raisonSociale || company.name || 'Entreprise')
          const initial = name.trim().charAt(0).toUpperCase() || 'E'
          const sectorStr = String(company.sector || '').trim()
          const isSelected = selectedCompany?.id === company.id
          const avatarStyle = getAvatarStyle(name)
          const sectorStyle = getSectorChipClass(sectorStr)

          return (
            <div
              key={company.id}
              onClick={() => setSelectedCompany(company)}
              className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3.5 rounded-xl border transition-all duration-150 cursor-pointer w-full min-w-0 box-border overflow-hidden ${
                isSelected
                  ? 'border-2 border-primary bg-primary/[0.03] shadow-sm'
                  : 'border-border/80 bg-card hover:border-primary/40 hover:shadow-md'
              }`}
              style={{
                minHeight: '88px',
                boxShadow: isSelected
                  ? '0 2px 8px rgba(47, 91, 234, 0.12)'
                  : '0 1px 2px rgba(16, 24, 40, 0.04)'
              }}
            >
              {/* ── Zone Gauche (Avatar) + Zone Centre (Infos) ── */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
                {/* Avatar initiales */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[15px] font-bold transition-transform duration-150 group-hover:scale-105 ${avatarStyle}`}
                >
                  {initial}
                </div>

                {/* Info Textuelle */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  {/* Ligne 1 : Nom + Verified Check + Chip Secteur (22px) */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="truncate text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {name}
                    </span>

                    {company.verified !== false && (
                      <span
                        className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary shrink-0"
                        title="Vérifié"
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}

                    {sectorStr && (
                      <span
                        className={`inline-flex items-center h-[22px] px-2 rounded-full border text-[11px] font-semibold leading-none truncate max-w-[140px] sm:max-w-[190px] ${sectorStyle}`}
                        title={sectorStr}
                      >
                        {sectorStr}
                      </span>
                    )}

                    {company.sigle && (
                      <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-medium">
                        {String(company.sigle)}
                      </span>
                    )}
                  </div>

                  {/* Ligne 2 : Ville/Région + Téléphone + Email */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 text-[12px] text-muted-foreground flex-wrap min-w-0">
                    {(company.city || company.region) && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                        <MapPin size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {String(company.city || '')}
                          {company.region && !company.city ? String(company.region) : ''}
                        </span>
                      </span>
                    )}

                    {company.telephone && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80 shrink-0">
                        <Phone size={12} className="text-muted-foreground" />
                        <span>{String(company.telephone)}</span>
                      </span>
                    )}

                    {company.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[160px] text-muted-foreground hidden md:inline-flex">
                        <Mail size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{String(company.email)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Zone Droite (Actions) ── */}
              <div
                className="flex items-center justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Ghost 1: Appel direct */}
                {company.telephone && (
                  <a
                    href={`tel:${company.telephone}`}
                    className="h-8 w-8 rounded-lg border border-border/80 bg-background/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-150 shrink-0"
                    title={`Appeler ${company.telephone}`}
                  >
                    <Phone size={14} strokeWidth={1.8} />
                  </a>
                )}

                {/* Ghost 2: WhatsApp (teinte verte discrète au hover) */}
                {company.telephone && (
                  <a
                    href={getWhatsAppUrl(
                      String(company.telephone),
                      `Bonjour, je vous contacte au sujet de ${name}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 w-8 rounded-lg border border-border/80 bg-background/60 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 flex items-center justify-center text-muted-foreground transition-all duration-150 shrink-0"
                    title="WhatsApp"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                  </a>
                )}

                {/* Ghost 3: Sauvegarder */}
                <SaveCompanyButton company={company} iconOnly={true} />

                {/* Bouton Principal: + Pipeline */}
                <AddToPipelineButton company={company} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Drawer latéral au clic */}
      <CompanyDetailDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </>
  )
}
