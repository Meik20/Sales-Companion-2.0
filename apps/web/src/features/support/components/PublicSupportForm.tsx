'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'
import { BUSINESS_SECTORS } from '@sales-companion/shared'
import {
  Building2,
  Mail,
  User,
  Phone,
  Send,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from 'lucide-react'

export function PublicSupportForm() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  const initialType = searchParams.get('type') || 'corporate_domain'
  const initialEmail = searchParams.get('email') || ''
  const initialName = searchParams.get('name') || ''
  const initialCompany = searchParams.get('company') || ''
  const initialSector = searchParams.get('sector') || ''

  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [company, setCompany] = useState(initialCompany)
  const [sector, setSector] = useState(initialSector)
  const [phone, setPhone] = useState('')
  const [requestType, setRequestType] = useState(initialType)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pre-fill fields when query params change
  useEffect(() => {
    if (initialName && !name) setName(initialName)
    if (initialEmail && !email) setEmail(initialEmail)
    if (initialCompany && !company) setCompany(initialCompany)
    if (initialSector && !sector) setSector(initialSector)
    if (initialType && requestType === 'corporate_domain') setRequestType(initialType)
  }, [initialName, initialEmail, initialCompany, initialSector, initialType])

  // Pre-fill sensible default message for corporate domain requests if empty
  useEffect(() => {
    if (requestType === 'corporate_domain' && !message) {
      const defaultMsg =
        t('support.defaultCorporateMsg') ||
        "Bonjour,\n\nNotre entreprise n'utilise pas de domaine email personnalisé (ex: @notre-entreprise.cm) mais utilise des emails standards. Nous souhaitons créer un compte Manager pour piloter notre équipe commerciale.\n\nMerci de bien vouloir étudier notre demande d'activation."
      setMessage(defaultMsg)
    }
  }, [requestType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('support.errorNameRequired') || 'Veuillez saisir votre nom complet.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError(t('support.errorEmailRequired') || 'Veuillez saisir une adresse email valide.')
      return
    }
    if (!company.trim() && requestType === 'corporate_domain') {
      setError(t('support.errorCompanyRequired') || "Veuillez renseigner le nom de l'entreprise.")
      return
    }
    if (!message.trim()) {
      setError(t('support.errorMessageRequired') || 'Veuillez décrire votre demande.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/support/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          sector,
          phone,
          type: requestType,
          subject:
            subject.trim() ||
            (requestType === 'corporate_domain'
              ? `Dérogation domaine - ${company || name}`
              : `Demande support - ${name}`),
          message
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission de la demande.')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-xl animate-fade-in px-4 py-12">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-8 ring-blue-500/5">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground font-syne sm:text-3xl">
              {t('support.successTitle') || 'Demande transmise avec succès !'}
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('support.successDesc') ||
                "Votre requête a bien été enregistrée et transmise à notre équipe administrative. Un responsable va examiner les informations de votre entreprise et vous contacter sous peu par email."}
            </p>

            <div className="mt-6 rounded-xl border border-border/60 bg-secondary/30 p-4 text-left text-xs text-muted-foreground">
              <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 font-medium text-foreground">
                <span>{t('support.recapTitle') || 'Récapitulatif de votre demande'}</span>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                  En attente admin
                </span>
              </div>
              <p>
                <strong className="text-foreground">👤 Nom :</strong> {name}
              </p>
              <p className="mt-1">
                <strong className="text-foreground">📧 Email :</strong> {email}
              </p>
              {company && (
                <p className="mt-1">
                  <strong className="text-foreground">🏢 Entreprise :</strong> {company}
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={routes.register}>
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft size={16} className="mr-2" />
                  {t('support.backToRegister') || "Retour à l'inscription"}
                </Button>
              </Link>
              <Link href={routes.login}>
                <Button className="w-full bg-primary text-white hover:bg-primary/90 sm:w-auto">
                  {t('support.backToLogin') || 'Connexion'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={routes.register}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {t('support.backToRegister') || "Retour à l'inscription"}
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow background accents */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        {/* Header */}
        <div className="relative mb-8 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <ScIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground font-syne sm:text-2xl">
                {t('support.publicTitle') || 'Assistance & Validation de Compte'}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {t('support.publicSubtitle') ||
                  "Soumettez votre demande directement à l'équipe support Sales Companion 2.0."}
              </p>
            </div>
          </div>

          {/* Context banner for corporate domain */}
          {requestType === 'corporate_domain' && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-200/90 sm:text-[13px]">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <ShieldCheck size={16} />
                <span>
                  {t('support.corporateDomainBannerTitle') ||
                    "Création de compte Manager sans domaine d'entreprise personnalisé"}
                </span>
              </div>
              <p className="mt-1.5 text-muted-foreground">
                {t('support.corporateDomainBannerDesc') ||
                  "Par mesure de sécurité, les comptes Manager requièrent habituellement un domaine email d'entreprise. Si vous utilisez une messagerie sans nom de domaine personnalisé, notre équipe d'administration peut valider manuellement votre profil pour vous donner l'accès."}
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <FormField label={t('support.nameLabel') || 'Nom complet'} required>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <Input
                  placeholder="Jean Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </FormField>

            {/* Email */}
            <FormField label={t('support.emailLabel') || 'Email de contact'} required>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="jean.dupont@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Company */}
            <FormField
              label={t('support.companyLabel') || "Nom de l'entreprise"}
              required={requestType === 'corporate_domain'}
            >
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <Input
                  placeholder="Ex: Cameroun Trading SARL"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-10"
                />
              </div>
            </FormField>

            {/* Phone */}
            <FormField label={t('support.phoneLabel') || 'Téléphone / WhatsApp'}>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="+237 6XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Request Type */}
            <FormField label={t('support.requestTypeLabel') || 'Type de demande'}>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs text-foreground outline-none transition focus:border-primary"
              >
                <option value="corporate_domain">
                  {t('support.typeCorporateDomain') || 'Dérogation domaine entreprise (Manager)'}
                </option>
                <option value="access_issue">
                  {t('support.typeAccessIssue') || "Problème d'accès ou d'inscription"}
                </option>
                <option value="commercial">
                  {t('support.typeCommercial') || 'Demande commerciale & Démo'}
                </option>
                <option value="other">{t('support.typeOther') || 'Autre demande'}</option>
              </select>
            </FormField>

            {/* Sector */}
            <FormField label={t('support.sectorLabel') || "Secteur d'activité"}>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs text-foreground outline-none transition focus:border-primary"
              >
                <option value="">
                  {t('support.selectSector') || 'Sélectionnez votre secteur…'}
                </option>
                {BUSINESS_SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Subject */}
          <FormField label={t('support.subjectLabel') || 'Sujet'}>
            <Input
              placeholder={
                requestType === 'corporate_domain'
                  ? 'Ex: Dérogation création compte Manager'
                  : "Ex: Besoin d'aide pour mon inscription"
              }
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </FormField>

          {/* Message */}
          <FormField label={t('support.messageLabel') || 'Message / Détails'} required>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                t('support.messagePlaceholder') ||
                'Expliquez brièvement votre demande ou votre activité…'
              }
              className="w-full rounded-lg border border-border bg-card p-3.5 text-xs text-foreground outline-none transition focus:border-primary"
              required
            />
          </FormField>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              {loading ? (
                <span>{t('support.submitting') || 'Envoi en cours…'}</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send size={15} />
                  {t('support.submitBtn') || 'Envoyer ma demande au support'}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
