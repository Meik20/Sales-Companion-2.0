'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors, shadows } from '@/styles/tokens'
import { Check, Zap, Shield, Users, Loader2, Phone, ArrowRight, X } from 'lucide-react'
import { routes } from '@/constants/routes'

// ── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key:        'starter',
    label:      'Starter',
    price:      '5 000',
    period:     'FCFA / mois',
    badge:      null,
    color:      '#3b82f6',
    colorBg:    'rgba(59,130,246,0.08)',
    icon:       Zap,
    searches:   200,
    features:   [
      'Recherche avancée',
      'Pipeline personnel',
      '200 recherches / jour',
      'Export Excel',
    ],
  },
  {
    key:        'pro',
    label:      'Pro',
    price:      '15 000',
    period:     'FCFA / mois',
    badge:      '⭐ Populaire',
    color:      '#f59e0b',
    colorBg:    'rgba(245,158,11,0.08)',
    icon:       Shield,
    searches:   1000,
    features:   [
      'Tout Starter inclus',
      '1 000 recherches / jour',
      'Assistant IA commercial',
      'Support prioritaire',
    ],
  },
  {
    key:        'enterprise',
    label:      'Enterprise',
    price:      '50 000',
    period:     'FCFA / mois',
    badge:      '💎 Premium',
    color:      '#8b5cf6',
    colorBg:    'rgba(139,92,246,0.08)',
    icon:       Users,
    searches:   99999,
    features:   [
      'Tout Pro inclus',
      'Recherches illimitées',
      'Gestion équipe complète',
      'Déploiement dédié',
      'Support dédié',
    ],
  },
]

// ── Composant principal ───────────────────────────────────────────────────────
export default function UpgradePage() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [phone, setPhone]               = useState('')
  const [step, setStep]                 = useState<'plans' | 'payment' | 'pending' | 'success'>('plans')
  const [loading, setLoading]           = useState(false)
  const [externalRef, setExternalRef]   = useState<string | null>(null)
  const [campayRef, setCampayRef]       = useState<string | null>(null)
  const [pollCount, setPollCount]       = useState(0)

  const currentPlan = user?.plan ?? 'free'
  const plan = PLANS.find(p => p.key === selectedPlan)

  // ── Sélection d'un plan ───────────────────────────────────────────────────
  function handleSelectPlan(key: string) {
    setSelectedPlan(key)
    setStep('payment')
  }

  // ── Initier le paiement ───────────────────────────────────────────────────
  async function handlePay() {
    if (!selectedPlan || !user) return

    const cleaned = phone.replace(/\s+/g, '')
    if (!/^(237)?[0-9]{8,9}$/.test(cleaned)) {
      pushToast({ type: 'error', title: 'Numéro invalide', description: 'Format : 237 6XX XXX XXX' })
      return
    }

    const formattedPhone = cleaned.startsWith('237') ? cleaned : `237${cleaned}`
    setLoading(true)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan, phone: formattedPhone }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors du paiement')

      setExternalRef(data.external_reference)
      setCampayRef(data.campay_reference)
      setStep('pending')
      startPolling(data.external_reference)
    } catch (err) {
      pushToast({ type: 'error', title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setLoading(false)
    }
  }

  // ── Polling du statut ─────────────────────────────────────────────────────
  function startPolling(ref: string) {
    let count = 0
    const MAX_POLLS = 24 // 2 min (24 × 5s)

    const interval = setInterval(async () => {
      count++
      setPollCount(count)

      try {
        const res = await fetch(`/api/payment/status/${ref}`)
        const data = await res.json()

        if (data.status === 'SUCCESSFUL') {
          clearInterval(interval)
          setStep('success')
          pushToast({ type: 'success', title: '✅ Paiement confirmé !', description: `Plan ${plan?.label} activé.` })
        } else if (data.status === 'FAILED') {
          clearInterval(interval)
          pushToast({ type: 'error', title: 'Paiement refusé', description: 'Vérifiez votre solde Mobile Money.' })
          setStep('payment')
        } else if (count >= MAX_POLLS) {
          clearInterval(interval)
          pushToast({ type: 'info', title: 'Délai dépassé', description: 'Le paiement est en attente. Revenez dans quelques minutes.' })
          setStep('payment')
        }
      } catch {
        // Ignorer les erreurs réseau passagères
      }
    }, 5000)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main>
      <AppShell>
        <PageHeader
          title="Passer à un plan supérieur"
          subtitle="Choisissez votre abonnement et payez par Mobile Money (MTN ou Orange)."
        />

        {/* ── ÉTAPE 1 : Sélection du plan ─────────────────────────────────── */}
        {step === 'plans' && (
          <div>
            {/* Indicateur plan actuel */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 9999,
              background: 'rgba(27,122,62,0.12)', border: '1px solid rgba(27,122,62,0.25)',
              fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 28,
            }}>
              ✓ Plan actuel : <span style={{ textTransform: 'capitalize' }}>{currentPlan}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
              {PLANS.map(p => {
                const Icon = p.icon
                const isCurrent = p.key === currentPlan
                return (
                  <div
                    key={p.key}
                    onClick={() => !isCurrent && handleSelectPlan(p.key)}
                    style={{
                      background:  colors.bg2,
                      border:      `2px solid ${isCurrent ? p.color : colors.border}`,
                      borderRadius: 16,
                      padding:     '24px 22px',
                      cursor:      isCurrent ? 'not-allowed' : 'pointer',
                      opacity:     isCurrent ? 0.6 : 1,
                      transition:  'all 220ms ease',
                      position:    'relative',
                      boxShadow:   isCurrent ? `0 0 0 4px ${p.color}22` : shadows.sm,
                    }}
                    onMouseEnter={e => {
                      if (!isCurrent) (e.currentTarget as HTMLDivElement).style.border = `2px solid ${p.color}`
                      if (!isCurrent) (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 4px ${p.color}22`
                    }}
                    onMouseLeave={e => {
                      if (!isCurrent) (e.currentTarget as HTMLDivElement).style.border = `2px solid ${colors.border}`
                      if (!isCurrent) (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.sm
                    }}
                  >
                    {/* Badge */}
                    {p.badge && (
                      <div style={{
                        position:   'absolute', top: -12, right: 18,
                        background: p.color, color: '#fff',
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 9999,
                      }}>
                        {p.badge}
                      </div>
                    )}

                    {/* Icon + nom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: p.colorBg, border: `1px solid ${p.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={20} color={p.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 17, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textMid }}>
                          {p.searches === 99999 ? 'Illimitées' : `${p.searches} recherches/j`}
                        </div>
                      </div>
                    </div>

                    {/* Prix */}
                    <div style={{ marginBottom: 18 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: p.color, fontFamily: "'Syne',sans-serif" }}>
                        {p.price}
                      </span>
                      <span style={{ fontSize: 13, color: colors.textMid, marginLeft: 6 }}>{p.period}</span>
                    </div>

                    {/* Features */}
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {p.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text }}>
                          <Check size={14} color={p.color} style={{ flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 0', borderRadius: 10,
                      background: isCurrent ? 'transparent' : p.colorBg,
                      border: `1px solid ${isCurrent ? colors.border : p.color}`,
                      color: isCurrent ? colors.textMid : p.color,
                      fontWeight: 700, fontSize: 13,
                    }}>
                      {isCurrent ? 'Plan actuel' : 'Choisir ce plan'}
                      {!isCurrent && <ArrowRight size={14} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Saisie du numéro Mobile Money ─────────────────────── */}
        {step === 'payment' && plan && (
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <button
              onClick={() => setStep('plans')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none',
                color: colors.textMid, cursor: 'pointer', fontSize: 13,
                marginBottom: 24, padding: 0,
              }}
            >
              ← Retour aux plans
            </button>

            <div style={{
              background: colors.bg2, border: `2px solid ${plan.color}44`,
              borderRadius: 16, padding: '28px 24px',
              boxShadow: `0 0 32px ${plan.color}18`,
            }}>
              {/* Résumé plan */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: plan.colorBg, border: `1px solid ${plan.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <plan.icon size={22} color={plan.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
                    Plan {plan.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: plan.color, fontFamily: "'Syne',sans-serif" }}>
                    {plan.price} <span style={{ fontSize: 13, fontWeight: 400, color: colors.textMid }}>FCFA/mois</span>
                  </div>
                </div>
              </div>

              {/* Champ numéro */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
                  📱 Numéro Mobile Money
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: colors.textMid,
                  }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Ex : 690 000 000"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 12px 11px 36px',
                      background: colors.bg, border: `1px solid ${colors.border}`,
                      borderRadius: 10, fontSize: 15, color: colors.text,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.target.style.borderColor = plan.color)}
                    onBlur={e => (e.target.style.borderColor = colors.border)}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: colors.textMid }}>
                  Fonctionne avec MTN Mobile Money et Orange Money. Le code 237 est ajouté automatiquement.
                </p>
              </div>

              {/* Info paiement */}
              <div style={{
                background: 'rgba(27,122,62,0.08)', border: '1px solid rgba(27,122,62,0.2)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 20,
                fontSize: 12.5, color: colors.textMid, lineHeight: 1.6,
              }}>
                <strong style={{ color: colors.text }}>Comment ça marche :</strong><br />
                1. Cliquez sur « Payer maintenant »<br />
                2. Vous recevrez une notification sur votre téléphone<br />
                3. Confirmez avec votre PIN Mobile Money<br />
                4. Votre plan sera activé automatiquement ✅
              </div>

              {/* Bouton payer */}
              <button
                onClick={handlePay}
                disabled={loading || !phone}
                style={{
                  width: '100%', padding: '13px 0',
                  background: loading || !phone ? colors.border : plan.color,
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 700, cursor: loading || !phone ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 200ms ease',
                  fontFamily: "'Syne',sans-serif",
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Connexion à CAMPAY…</>
                ) : (
                  <>Payer {plan.price} FCFA <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : En attente de confirmation ─────────────────────────── */}
        {step === 'pending' && plan && (
          <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              background: colors.bg2, border: `2px solid ${plan.color}44`,
              borderRadius: 16, padding: '40px 28px',
              boxShadow: `0 0 40px ${plan.color}18`,
            }}>
              {/* Animation */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: plan.colorBg, border: `2px solid ${plan.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <Phone size={32} color={plan.color} />
              </div>

              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: colors.text, margin: '0 0 10px' }}>
                En attente de confirmation
              </h2>
              <p style={{ color: colors.textMid, fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
                Une notification Mobile Money a été envoyée sur votre téléphone.<br />
                <strong style={{ color: colors.text }}>Confirmez avec votre PIN</strong> pour activer votre plan.
              </p>

              {/* Barre de progression */}
              <div style={{ background: colors.bg, borderRadius: 9999, height: 6, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 9999,
                  background: plan.color,
                  width: `${Math.min((pollCount / 24) * 100, 100)}%`,
                  transition: 'width 500ms ease',
                }} />
              </div>
              <p style={{ fontSize: 12, color: colors.textMid, margin: '0 0 24px' }}>
                Vérification automatique ({pollCount}/24)…
              </p>

              <div style={{
                background: 'rgba(27,122,62,0.06)', border: '1px solid rgba(27,122,62,0.15)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 12, color: colors.textMid,
              }}>
                Référence : <code style={{ color: colors.text, fontSize: 11 }}>{campayRef ?? externalRef}</code>
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : Succès ──────────────────────────────────────────────── */}
        {step === 'success' && plan && (
          <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              background: colors.bg2, border: '2px solid rgba(74,222,128,0.4)',
              borderRadius: 16, padding: '40px 28px',
              boxShadow: '0 0 40px rgba(74,222,128,0.12)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(74,222,128,0.12)', border: '2px solid #4ade80',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Check size={36} color="#4ade80" />
              </div>

              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: '#4ade80', margin: '0 0 10px' }}>
                Plan {plan.label} activé !
              </h2>
              <p style={{ color: colors.textMid, fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
                Votre paiement a été confirmé. Vous bénéficiez maintenant de toutes les fonctionnalités du plan <strong style={{ color: colors.text }}>{plan.label}</strong>.
              </p>

              <button
                onClick={() => router.push(routes.search)}
                style={{
                  width: '100%', padding: '13px 0',
                  background: '#1B7A3E', color: '#fff', border: '1px solid #2ea05a',
                  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: "'Syne',sans-serif",
                }}
              >
                Commencer à prospecter <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin   { to { transform: rotate(360deg); } }
          @keyframes pulse  {
            0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
            50%       { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
          }
        `}</style>
      </AppShell>
    </main>
  )
}
