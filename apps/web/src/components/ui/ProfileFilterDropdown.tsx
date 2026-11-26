'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export interface ProfileFilterOption {
  id: string
  label: string
  /** Badge secondaire (ex. Segment / Zone ou alerte retard) */
  badge?: string | null
  /** Information complémentaire alignée à droite (ex. "12 opportunités") */
  meta?: string | null
  /** Style d'alerte sur le badge (ex. relances en retard) */
  hasAlert?: boolean
}

interface ProfileFilterDropdownProps {
  options: ProfileFilterOption[]
  value: string | undefined
  onChange: (id: string | undefined) => void
  placeholder: string
  searchPlaceholder?: string
  emptyLabel?: string
  minWidth?: number
}

/**
 * Sélecteur déroulant 100 % opaque (Règle UI §8) pour filtrer par profil
 * (Coordinateur, Superviseur ou Commercial) avec recherche intégrée dès > 5 entrées.
 */
export function ProfileFilterDropdown({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  minWidth = 220
}: ProfileFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) ?? null,
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        (opt.meta && opt.meta.toLowerCase().includes(q))
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open && options.length > 5) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 20)
      return () => window.clearTimeout(id)
    }
    if (!open) {
      setQuery('')
    }
  }, [open, options.length])

  const isSelected = Boolean(selectedOption)

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          height: 34,
          minWidth,
          maxWidth: '100%',
          padding: '0 12px',
          borderRadius: 20,
          border: isSelected
            ? '1px solid #6366f1'
            : '1px solid var(--border, rgba(255,255,255,0.12))',
          background: isSelected
            ? '#6366f1'
            : 'var(--secondary, #1e2a3b)',
          color: isSelected
            ? '#ffffff'
            : 'var(--foreground, #f1f5f9)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          transition: 'all 150ms ease',
          outline: 'none'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              style={{
                fontSize: 10.5,
                padding: '1px 7px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            opacity: isSelected ? 0.9 : 0.7,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease'
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: Math.max(minWidth, 270),
            maxWidth: 'min(360px, 90vw)',
            backgroundColor: 'var(--card, #131c2e)',
            border: '1px solid var(--border, rgba(255,255,255,0.12))',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
            zIndex: 60,
            overflow: 'hidden',
            backdropFilter: 'none'
          }}
        >
          {options.length > 5 && (
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--card, #131c2e)'
              }}
            >
              <Search size={13} style={{ color: 'var(--muted-foreground, #94a3b8)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--foreground, #f1f5f9)',
                  fontSize: 12
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted-foreground, #94a3b8)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div
            style={{
              maxHeight: 260,
              overflowY: 'auto',
              padding: 4,
              backgroundColor: 'var(--card, #131c2e)'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: 12,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textAlign: 'center'
                }}
              >
                {emptyLabel}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const active = opt.id === value
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.id)
                      setOpen(false)
                    }}
                    className="hover:bg-secondary/80 transition-colors"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: active ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                      color: active ? '#6366f1' : 'var(--foreground, #f1f5f9)',
                      fontSize: 12.5,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {active && <Check size={13} />}
                      </span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {opt.label}
                      </span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0
                      }}
                    >
                      {opt.meta && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--muted-foreground, #94a3b8)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {opt.meta}
                        </span>
                      )}
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: '1px 7px',
                            borderRadius: 10,
                            background: opt.hasAlert
                              ? 'rgba(239, 68, 68, 0.14)'
                              : 'rgba(99, 102, 241, 0.12)',
                            color: opt.hasAlert
                              ? '#ef4444'
                              : 'var(--muted-foreground, #94a3b8)',
                            border: opt.hasAlert
                              ? '1px solid rgba(239, 68, 68, 0.25)'
                              : '1px solid var(--border, rgba(255,255,255,0.08))',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
