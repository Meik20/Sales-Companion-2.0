'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors, shadows } from '@/styles/tokens'
import { Check, Zap, Shield, Users, Loader2, Copy, AlertCircle } from 'lucide-react'
import { routes } from '@/constants/routes'

import { PLAN_LIMITS, PLAN_PRICES } from '@sales-companion/shared'

// ── Configuration des comptes de réception ──────────────────────────────────
const PAYMENT_ACCOUNTS = {
  MTN: {
    number: process.env.NEXT_PUBLIC_PAYMENT_MTN_NUMBER || '655 88 60 86',
    name: process.env.NEXT_PUBLIC_PAYMENT_MTN_NAME || 'MBAYE EYOUM IVAN KEVIN'
  },
  ORANGE: {
    number: process.env.NEXT_PUBLIC_PAYMENT_ORANGE_NUMBER || '655 88 60 86',
    name: process.env.NEXT_PUBLIC_PAYMENT_ORANGE_NAME || 'MBAYE EYOUM IVAN KEVIN'
  }
}

// Helper pour formater les prix
const formatPrice = (p: number) => p.toLocaleString('fr-FR').replace(/\s/g, ' ')

// ── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: formatPrice(PLAN_PRICES.starter),
    amount: PLAN_PRICES.starter,
    period: 'FCFA / mois',
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.08)',
    icon: Zap,
    searches: PLAN_LIMITS.starter,
    features: [
      'Recherche avancée',
      'Pipeline personnel',
      `${PLAN_LIMITS.starter} recherches / jour`,
      'Export Excel'
    ]
  },
  {
    key: 'pro',
    label: 'Pro',
    price: formatPrice(PLAN_PRICES.pro),
    amount: PLAN_PRICES.pro,
    period: 'FCFA / mois',
    badge: '⭐ Populaire',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    icon: Shield,
    searches: PLAN_LIMITS.pro,
    companySize: 'Idéal pour les PME et entreprises de moins de 20 collaborateurs',
    features: [
      'Recherche avancée',
      'Pipeline illimité',
      `${PLAN_LIMITS.pro} recherches / jour`,
      'Companion IA commercial'
    ]
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: formatPrice(PLAN_PRICES.enterprise),
    amount: PLAN_PRICES.enterprise,
    period: 'FCFA / mois',
    badge: '💎 Premium',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.08)',
    icon: Users,
    searches: PLAN_LIMITS.enterprise,
    companySize: 'Conçu pour les grandes entreprises et équipes de plus de 20 commerciaux',
    features: [
      'Tout Pro inclus',
      `${PLAN_LIMITS.enterprise} recherches / jour`,
      'Gestion équipe complète',
      'Support dédié'
    ]
  }
]

export default function UpgradePage() {
  const { user, loading: userLoading } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Détecte si l'utilisateur arrive depuis la page d'inscription (nouveau manager)
  const isNewManager = searchParams.get('from') === 'register' && user?.role === 'manager'

  // ── Protection de la page ────────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && user) {
      if (user.role !== 'manager' && user.role !== 'independent') {
        router.replace(routes.search)
        return
      }

      // Si l'utilisateur a été forcé ici lors de l'inscription/connexion mais qu'il est maintenant actif et payé,
      // on le redirige automatiquement vers le tableau de bord (ex: l'admin vient de l'activer).
      const fromParam = searchParams.get('from')
      const isForced = fromParam === 'register' || fromParam === 'login'
      
      if (isForced && user.active && user.plan !== 'free') {
        router.replace(routes.search)
      }
    }
  }, [user, userLoading, router, searchParams])

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [operator, setOperator] = useState<'MTN' | 'ORANGE'>('MTN')
  const [transactionId, setTransactionId] = useState('')
  const [step, setStep] = useState<'plans' | 'instructions' | 'success'>('plans')

  // Sync state once user is loaded
  useEffect(() => {
    if (!userLoading && user) {
      if (user.plan !== 'free') {
        setSelectedPlan(user.plan)
        if (isNewManager && !user.active) {
          setStep('success')
        }
      }
    }
  }, [user, userLoading, isNewManager])
  const [loading, setLoading] = useState(false)

  const currentPlan = user?.plan ?? 'free'
  const plan = PLANS.find((p) => p.key === selectedPlan)

  // Managers voient uniquement Pro & Enterprise ; les indépendants voient tout
  const visiblePlans = isNewManager
    ? PLANS.filter((p) => p.key === 'pro' || p.key === 'enterprise')
    : PLANS

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    pushToast({ type: 'success', title: 'Copié !', description: text })
  }

  // ── Soumettre la preuve de paiement ──────────────────────────────────────
  async function handleSubmit() {
    if (!selectedPlan || !transactionId || !user) return
    setLoading(true)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/payment/manual-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          operator,
          transactionId: transactionId.trim(),
          amount: plan?.amount
        })
      })

      if (!res.ok) throw new Error("Erreur lors de l'envoi")
      setStep('success')
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Erreur',
        description: "Impossible d'envoyer votre demande."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <AppShell>
        <PageHeader
          title={isNewManager ? '🔐 Activez votre compte Manager' : 'Passer à un plan supérieur'}
          subtitle={
            isNewManager
              ? 'Votre compte a été créé avec succès. Choisissez un plan pour débloquer votre accès.'
              : 'Choisissez votre abonnement et payez par transfert Mobile Money.'
          }
        />

        {/* ── Bannière urgente pour les nouveaux managers ─────────────────── */}
        {isNewManager && step !== 'success' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(245,158,11,0.08)',
              border: '1.5px solid rgba(245,158,11,0.4)',
              marginBottom: 28
            }}
          >
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>
                Accès au tableau de bord suspendu
              </p>
              <p style={{ margin: 0, fontSize: 13, color: colors.textMid, lineHeight: 1.6 }}>
                En tant que <strong>Manager</strong>, votre compte doit être activé via un abonnement payant.
                Choisissez un plan ci-dessous, effectuez le paiement Mobile Money, puis soumettez votre
                ID de transaction. Un administrateur validera votre accès sous 24h.
              </p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 1 : Sélection du plan ─────────────────────────────────── */}
        {step === 'plans' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24
            }}
          >
            {visiblePlans.map((p) => {
              const isCurrent = p.key === currentPlan
              return (
                <div
                  key={p.key}
                  onClick={() => {
                    if (!isCurrent) {
                      setSelectedPlan(p.key)
                      setStep('instructions')
                    }
                  }}
                  style={{
                    background: colors.bg2,
                    border: `2px solid ${isCurrent ? p.color : colors.border}`,
                    borderRadius: 16,
                    padding: '28px 24px',
                    cursor: isCurrent ? 'default' : 'pointer',
                    opacity: isCurrent ? 0.7 : 1,
                    transition: 'all 200ms ease',
                    position: 'relative'
                  }}
                >
                  {/* Indice taille d'entreprise — affiché uniquement pour les managers */}
                  {isNewManager && (p as any).companySize && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 8,
                        background: `${p.color}14`,
                        border: `1px solid ${p.color}33`,
                        fontSize: 11,
                        color: p.color,
                        fontWeight: 600,
                        marginBottom: 14
                      }}
                    >
                      🏢 {(p as any).companySize}
                    </div>
                  )}
                  {p.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        background: p.color,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: 999
                      }}
                    >
                      {p.badge}
                    </div>
                  )}
                  <p
                    style={{
                      fontWeight: 800,
                      fontSize: 18,
                      color: colors.text,
                      margin: '0 0 4px',
                      fontFamily: "sans-serif"
                    }}
                  >
                    {p.label}
                  </p>
                  <p
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: p.color,
                      margin: '0 0 20px',
                      fontFamily: "sans-serif"
                    }}
                  >
                    {p.price}{' '}
                    <span style={{ fontSize: 14, fontWeight: 400, color: colors.textMid }}>
                      {p.period}
                    </span>
                  </p>

                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    {p.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: colors.text
                        }}
                      >
                        <Check size={14} color={p.color} /> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={isCurrent}
                    style={{
                      width: '100%',
                      padding: '12px 0',
                      borderRadius: 10,
                      border: 'none',
                      background: isCurrent ? colors.border : p.color,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: isCurrent ? 'default' : 'pointer'
                    }}
                  >
                    {isCurrent ? 'Votre plan actuel' : 'Choisir ce plan'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ÉTAPE 2 : Instructions de paiement ──────────────────────────── */}
        {step === 'instructions' && plan && (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div
              style={{
                background: colors.bg2,
                borderRadius: 20,
                padding: 32,
                border: `1px solid ${colors.border}`
              }}
            >
              <h2
                style={{ fontFamily: "sans-serif", margin: '0 0 20px', textAlign: 'center' }}
              >
                💳 Instructions de paiement
              </h2>

              {/* Sélecteur Opérateur */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {(['MTN', 'ORANGE'] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() => setOperator(op)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 10,
                      border: `2px solid ${operator === op ? (op === 'MTN' ? '#fde047' : '#f97316') : colors.border}`,
                      background:
                        operator === op
                          ? op === 'MTN'
                            ? 'rgba(253,224,71,0.1)'
                            : 'rgba(249,115,22,0.1)'
                          : 'transparent',
                      color: colors.text,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {op} Money
                  </button>
                ))}
              </div>

              {/* Détails du transfert */}
              <div
                style={{ background: colors.bg3, borderRadius: 12, padding: 20, marginBottom: 24 }}
              >
                <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textMid }}>
                  Envoyez exactement <strong>{plan.price} FCFA</strong> au numéro suivant :
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12
                  }}
                >
                  <span style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
                    {PAYMENT_ACCOUNTS[operator].number}
                  </span>
                  <button
                    onClick={() => copyToClipboard(PAYMENT_ACCOUNTS[operator].number)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.textMid,
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <div style={{ fontSize: 13, color: colors.textMid }}>
                  Nom du compte : <strong>{PAYMENT_ACCOUNTS[operator].name}</strong>
                </div>
              </div>

              {/* Champ ID Transaction */}
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}
                >
                  ID de transaction (reçu par SMS)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 240511123456"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    outline: 'none'
                  }}
                />
                <p style={{ fontSize: 11, color: colors.textMid, marginTop: 6 }}>
                  Recopiez l'ID contenu dans le SMS de confirmation de {operator}.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !transactionId}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 10,
                  background: plan.color,
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading || !transactionId ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  'Confirmer mon paiement'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Succès / En attente ───────────────────────────────── */}
        {step === 'success' && (
          <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                background: colors.bg2,
                borderRadius: 20,
                padding: 40,
                border: `1px solid #4ade80`
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: 'rgba(74,222,128,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}
              >
                <Check size={32} color="#4ade80" />
              </div>
              <h2 style={{ fontFamily: "sans-serif", margin: '0 0 12px' }}>
                Demande envoyée !
              </h2>
              <p style={{ color: colors.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Votre demande de paiement pour le plan <strong>{plan?.label}</strong> est en cours
                de vérification.
                <br />
                Elle sera validée par un administrateur dans les plus brefs délais.
              </p>
              {isNewManager && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    fontSize: 13,
                    color: '#f59e0b',
                    marginBottom: 20,
                    textAlign: 'left'
                  }}
                >
                  ⏳ Votre accès sera débloqué dès qu'un administrateur aura confirmé votre paiement (généralement sous 24h). Vous recevrez un e-mail de confirmation.
                </div>
              )}
              <button
                onClick={() => router.push(routes.search)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 10,
                  background: colors.text,
                  color: colors.bg,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isNewManager ? 'Aller au tableau de bord' : 'Retour à l\'accueil'}
              </button>
            </div>
          </div>
        )}
      </AppShell>
    </main>
  )
}
