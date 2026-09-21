'use client'

import { useState } from 'react'
import { X, Building2, UserPlus, Phone, Mail, MapPin, Briefcase, Calendar, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/providers/I18nProvider'
import { CRM_SECTORS, CRM_CITIES, CRM_STATUS_LIST } from '../constants'
import type { CrmClient, CrmClientStatus } from '../types'

import type { CurrentUser } from '@/hooks/useCurrentUser'

type Props = {
  isOpen?: boolean
  onClose: () => void
  onSuccess: (client: CrmClient) => void
  userToken?: string
  user?: CurrentUser | null
}

export function AddClientModal({ isOpen, onClose, onSuccess, userToken, user }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<CrmClientStatus>('new')
  const [nextAction, setNextAction] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [notes, setNotes] = useState('')

  // If isOpen is explicitly set to false, don't render
  if (isOpen === false) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || !phone.trim()) return

    setLoading(true)
    setError(null)

    try {
      let token = userToken
      if (!token && user) {
        token = await user.getIdToken()
      }
      if (!token) {
        const { auth } = await import('@/services/firebase/client')
        token = (await auth.currentUser?.getIdToken()) ?? ''
      }

      const res = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          sector,
          city,
          address: address.trim(),
          status,
          nextAction: nextAction.trim(),
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
          notes: notes.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la création du client')
      }

      onSuccess(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div
        className="w-full max-w-[620px] max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--card, #131c2e)',
          borderColor: 'var(--border, rgba(255, 255, 255, 0.12))'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.08))' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
              style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6' }}
            >
              <UserPlus size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground m-0">
                {t('crm.addModal.title') || 'Ajouter un client'}
              </h2>
              <p className="text-xs text-muted-foreground m-0 mt-0.5">
                {t('crm.addModal.subtitle') || 'Créer une fiche de pilotage commercial'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex flex-col gap-4 flex-1">
          {error && (
            <div
              className="p-3 rounded-xl text-xs font-medium border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#f87171'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Entreprise & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-primary" />
                {t('crm.colCompany') || 'Entreprise'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: BatiCameroun SARL..."
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                👤 {t('crm.colContact') || 'Nom du contact'}
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: M. Jean Dupont..."
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
          </div>

          {/* Téléphone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-primary" />
                {t('crm.colPhone') || 'Téléphone'} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +237 6XX XX XX XX"
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-primary" />
                {t('field.email') || 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@entreprise.cm"
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
          </div>

          {/* Secteur & Ville */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Briefcase size={13} className="text-primary" />
                {t('crm.colSector') || 'Secteur'}
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              >
                <option value="">-- {t('crm.selectSector') || 'Choisir un secteur'} --</option>
                {CRM_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" />
                {t('crm.colCity') || 'Ville'}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              >
                <option value="">-- {t('crm.selectCity') || 'Choisir une ville'} --</option>
                {CRM_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statut CRM */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('crm.colStatus') || 'Statut CRM'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CrmClientStatus)}
              className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
            >
              {CRM_STATUS_LIST.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prochaine action & Échéance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                ⚡ {t('crm.colNextAction') || 'Prochaine action'}
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Ex: 📞 Appeler pour confirmation"
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                {t('crm.nextActionDate') || "Date d'échéance"}
              </label>
              <input
                type="date"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t('crm.notes') || 'Notes commerciales'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Détails importants concernant ce client..."
              className="w-full px-3 py-2 rounded-lg text-xs border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
              style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
            />
          </div>

          {/* Footer Buttons */}
          <div
            className="flex items-center justify-end gap-3 pt-3 border-t shrink-0"
            style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.08))' }}
          >
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('profile.cancelBtn') || 'Annuler'}
            </Button>
            <Button
              type="submit"
              disabled={loading || !companyName.trim() || !phone.trim()}
              className="flex items-center gap-2"
            >
              <Sparkles size={14} />
              {loading ? (t('profile.loading') || 'En cours…') : (t('crm.addModal.submit') || 'Ajouter le client')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
