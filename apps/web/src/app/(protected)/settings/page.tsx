'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState } from '@/components/feedback/index'
import { CreateCompanyForm } from '@/features/companies/components/CreateCompanyForm'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'

const planDetails: Record<string, { label: string; searches: number; features: string[] }> = {
  free:       { label: 'Gratuit',      searches: 50,    features: ['Recherche basique', 'Pipeline personnel', '50 recherches/jour'] },
  starter:    { label: 'Starter',      searches: 200,   features: ['Recherche avancée', 'Pipeline personnel', '200 recherches/jour', 'Export Excel'] },
  pro:        { label: 'Pro',          searches: 1000,  features: ['Tout Starter', 'Gestion équipe', '1 000 recherches/jour', 'Assistant IA', 'Support prioritaire'] },
  enterprise: { label: 'Entreprise',   searches: 99999, features: ['Tout Pro', 'Illimité', 'Déploiement dédié', 'Support dédié'] },
}

export default function SettingsPage() {
  const { user } = useCurrentUser()

  const plan = user?.plan ?? 'free'
  const planInfo = planDetails[plan] ?? planDetails.free

  return (
    <main>
      <AppShell>
        <PageHeader
          title="Paramètres"
          subtitle="Préférences utilisateur et informations d'abonnement."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Plan actuel */}
          <DataCard title="Abonnement actuel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
                    Plan {planInfo.label}
                  </span>
                  <Badge variant={plan === 'enterprise' ? 'gold' : plan === 'pro' ? 'success' : 'default'}>
                    {planInfo.label}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
                  {planInfo.searches === 99999 ? 'Recherches illimitées' : `${planInfo.searches} recherches / jour`}
                </p>
              </div>

              {plan !== 'enterprise' ? (
                <a
                  href="mailto:contact@salescompanion.cm?subject=Upgrade plan"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: '#1B7A3E',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid #2ea05a',
                    textDecoration: 'none',
                    transition: 'all 200ms ease',
                  }}
                >
                  ⬆️ Passer à un plan supérieur
                </a>
              ) : null}
            </div>

            {/* Fonctionnalités incluses */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {planInfo.features.map((f) => (
                <span
                  key={f}
                  style={{
                    padding: '5px 12px',
                    background: 'rgba(27,122,62,0.1)',
                    border: '1px solid rgba(27,122,62,0.2)',
                    borderRadius: 999,
                    fontSize: 12,
                    color: '#4ade80',
                    fontWeight: 500,
                  }}
                >
                  ✓ {f}
                </span>
              ))}
            </div>
          </DataCard>

          {/* Paramètres manager */}
          {user?.role === 'manager' ? (
            <DataCard
              title="Configuration équipe"
              subtitle="Paramètres de votre entreprise et de votre équipe commerciale."
            >
              <CreateCompanyForm />
            </DataCard>
          ) : null}

          {/* Infos compte */}
          {user?.role !== 'manager' ? (
            <DataCard title="Compte">
              <EmptyState
                title="Aucun paramètre avancé disponible"
                description="Passez au plan Manager pour accéder aux paramètres d'équipe."
                icon="⚙️"
              />
            </DataCard>
          ) : null}
        </div>
      </AppShell>
    </main>
  )
}
