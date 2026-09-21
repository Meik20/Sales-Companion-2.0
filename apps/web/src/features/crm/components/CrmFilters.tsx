'use client'

import { Search, Plus, X } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { CRM_STATUS_LIST, CRM_SECTORS, CRM_CITIES } from '../constants'

export type CrmFiltersState = {
  search: string
  status: string
  sector: string
  city: string
  sortBy: 'companyName' | 'lastActivityAt' | 'nextActionAt' | 'status'
}

type Props = {
  filters: CrmFiltersState
  onChange: (f: CrmFiltersState) => void
  onAddClient: () => void
  totalCount: number
  activeCount: number
  toFollowUpCount: number
}

export function CrmFilters({ filters, onChange, onAddClient, totalCount, activeCount, toFollowUpCount }: Props) {
  const { t } = useTranslation()

  function set<K extends keyof CrmFiltersState>(key: K, value: CrmFiltersState[K]) {
    onChange({ ...filters, [key]: value })
  }

  function resetFilters() {
    onChange({ search: '', status: '', sector: '', city: '', sortBy: 'lastActivityAt' })
  }

  const hasActiveFilters = filters.status || filters.sector || filters.city

  return (
    <div className="flex flex-col gap-4 mb-5">
      {/* Header stats + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatPill value={totalCount} label={t('crm.filtersAllClients')} color="var(--color-accent)" active={!filters.status} onClick={() => set('status', '')} />
          <StatPill value={activeCount} label={t('crm.filtersActive')} color="#22c55e" active={filters.status === 'active_group'} onClick={() => set('status', 'active_group')} />
          <StatPill value={toFollowUpCount} label={t('crm.filtersToFollowUp')} color="#f59e0b" active={filters.status === 'to_contact'} onClick={() => set('status', 'to_contact')} />
        </div>
        <button
          onClick={onAddClient}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-[13px] font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          {t('crm.addClient')}
        </button>
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('crm.searchPlaceholder')}
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => set('status', e.target.value)}
          className="h-10 min-w-[140px] cursor-pointer rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">{t('crm.filterAllStatuses')}</option>
          {CRM_STATUS_LIST.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Sector filter */}
        <select
          value={filters.sector}
          onChange={e => set('sector', e.target.value)}
          className="h-10 min-w-[140px] cursor-pointer rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">{t('crm.filterAllSectors')}</option>
          {CRM_SECTORS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* City filter */}
        <select
          value={filters.city}
          onChange={e => set('city', e.target.value)}
          className="h-10 min-w-[130px] cursor-pointer rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">{t('crm.filterAllCities')}</option>
          {CRM_CITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={e => set('sortBy', e.target.value as CrmFiltersState['sortBy'])}
          className="h-10 min-w-[140px] cursor-pointer rounded-xl border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="lastActivityAt">{t('crm.sortLastActivity')}</option>
          <option value="nextActionAt">{t('crm.sortNextAction')}</option>
          <option value="companyName">{t('crm.sortName')}</option>
          <option value="status">{t('crm.sortStatus')}</option>
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[12px] text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X size={13} />
            <span>{t('common.reset')}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function StatPill({
  value, label, color, active, onClick
}: { value: number; label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        borderColor: active ? color : 'var(--border)',
        background: active ? `${color}18` : 'var(--card)',
        color: active ? color : 'var(--muted-foreground)'
      }}
    >
      <span className="text-[18px] font-extrabold font-['Syne',sans-serif]" style={{ color }}>{value}</span>
      {label}
    </button>
  )
}
