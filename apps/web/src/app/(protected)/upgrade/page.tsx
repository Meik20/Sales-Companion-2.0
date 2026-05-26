'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors, shadows } from '@/styles/tokens'
import { Check, Zap, Shield, Users, Loader2, Copy, ArrowRight, MessageSquare } from 'lucide-react'
import { routes } from '@/constants/routes'

import { PLAN_LIMITS, PLAN_PRICES } from '@sales-companion/shared'

// ── Configuration des comptes de réception (À MODIFIER PAR VOUS) ──────────────
const PAYMENT_ACCOUNTS = {
  MTN: { number: '655 88 60 86', name: 'MBAYE EYOUM IVAN KEVIN' },
  ORANGE: { number: '655 88 60 86', name: 'MBAYE EYOUM IVAN KEVIN' }
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

  // ── Protection de la page ────────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && user) {
      if (user.role !== 'manager' && user.role !== 'independent') {
        router.replace(routes.search)
      }
    }
  }, [user, userLoading, router])

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [operator, setOperator] = useState<'MTN' | 'ORANGE'>('MTN')
  const [transactionId, setTransactionId] = useState('')
  const [step, setStep] = useState<'plans' | 'instructions' | 'success'>('plans')
  const [loading, setLoading] = useState(false)

  const currentPlan = user?.plan ?? 'free'
  const plan = PLANS.find((p) => p.key === selectedPlan)

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
          title="Passer à un plan supérieur"
          subtitle="Choisissez votre abonnement et payez par transfert Mobile Money."
        />

        {/* ── ÉTAPE 1 : Sélection du plan ─────────────────────────────────── */}
        {step === 'plans' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24
            }}
          >
            {PLANS.map((p) => {
              const isCurrent = p.key === currentPlan
              return (
                <div
                  key={p.key}
                  onClick={() =>
                    !isCurrent && {
                      setSelectedPlan: setSelectedPlan(p.key),
                      setStep: setStep('instructions')
                    }
                  }
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
                      fontFamily: "'Syne',sans-serif"
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
                      fontFamily: "'Syne',sans-serif"
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
                style={{ fontFamily: "'Syne',sans-serif", margin: '0 0 20px', textAlign: 'center' }}
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
              <h2 style={{ fontFamily: "'Syne',sans-serif", margin: '0 0 12px' }}>
                Demande envoyée !
              </h2>
              <p style={{ color: colors.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                Votre demande de paiement pour le plan <strong>{plan?.label}</strong> est en cours
                de vérification.
                <br />
                Elle sera validée par un administrateur dans les plus brefs délais.
              </p>
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
                Retour à l'accueil
              </button>
            </div>
          </div>
        )}
      </AppShell>
    </main>
  )
}
