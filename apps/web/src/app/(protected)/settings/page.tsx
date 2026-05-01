'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState, LoadingState } from '@/components/feedback/index'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'

function normalizeText(text: string) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function buildAccessId(firstname: string, lastname: string, company: string) {
  const first = normalizeText(firstname);
  const last  = normalizeText(lastname);
  const comp  = normalizeText(company);
  if (!first && !last && !comp) return '@entreprise';
  return `${first}${last}@${comp}`;
}

const planDetails = {
  free:       { label: 'Gratuit',      searches: 50,    features: ['Recherche basique', 'Pipeline personnel', '50 recherches/jour'] },
  starter:    { label: 'Starter',      searches: 200,   features: ['Recherche avancée', 'Pipeline personnel', '200 recherches/jour', 'Export Excel'] },
  pro:        { label: 'Pro',          searches: 1000,  features: ['Tout Starter', 'Gestion équipe', '1 000 recherches/jour', 'Assistant IA', 'Support prioritaire'] },
  enterprise: { label: 'Entreprise',   searches: 99999, features: ['Tout Pro', 'Illimité', 'Déploiement dédié', 'Support dédié'] },
}

export default function SettingsPage() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  // État Team Management
  const [accesses, setAccesses] = useState<any[]>([])
  const [loadingAccesses, setLoadingAccesses] = useState(false)
  const [formData, setFormData] = useState({ firstname: '', lastname: '', company: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const plan = user?.plan ?? 'free'
  const planInfo = planDetails[plan as keyof typeof planDetails] ?? planDetails.free

  const previewId = buildAccessId(formData.firstname, formData.lastname, formData.company || user?.companyName || 'Entreprise')

  // Charger les accès
  const loadAccesses = async () => {
    if (!user || user.role !== 'manager') return;
    setLoadingAccesses(true)
    try {
      const q = query(collection(db, 'team_accesses'), where('createdBy', '==', user.uid))
      const snap = await getDocs(q)
      setAccesses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()))
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Erreur', message: e.message })
    } finally {
      setLoadingAccesses(false)
    }
  }

  useEffect(() => {
    loadAccesses()
  }, [user])

  // Créer un accès
  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSubmitting(true)
    try {
      const accessId = buildAccessId(formData.firstname, formData.lastname, formData.company || user.companyName || 'Entreprise')
      if (accessId === '@entreprise') throw new Error("Identifiant invalide")

      const ref = doc(db, 'team_accesses', accessId)
      await setDoc(ref, {
        accessId,
        firstname: formData.firstname,
        lastname: formData.lastname,
        company: formData.company || user.companyName || 'Entreprise',
        role: 'member',
        status: 'pending',
        activated: false,
        firebaseUid: null,
        email: null,
        createdBy: user.uid,
        managerEmail: user.email,
        createdAt: serverTimestamp()
      })
      pushToast({ type: 'success', title: 'Accès créé !', message: `ID: ${accessId}` })
      setFormData({ firstname: '', lastname: '', company: '' })
      loadAccesses()
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Erreur', message: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Copier ID
  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id)
    pushToast({ type: 'info', title: 'ID copié', message: id })
  }

  // Révoquer
  const revokeAccess = async (id: string) => {
    if (!confirm("Voulez-vous révoquer cet accès ?")) return
    try {
      await updateDoc(doc(db, 'team_accesses', id), {
        status: 'revoked',
        revokedAt: serverTimestamp()
      })
      pushToast({ type: 'success', title: 'Accès révoqué' })
      loadAccesses()
    } catch (e: any) {
      pushToast({ type: 'error', title: 'Erreur', message: e.message })
    }
  }

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
                <button
                  onClick={() => pushToast({ type: 'info', title: 'Contactez votre Admin pour upgrade' })}
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
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  ⬆️ Passer à un plan supérieur
                </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <DataCard
                title="Créer un accès collaborateur"
                subtitle="Générez un identifiant unique pour inviter un membre dans votre équipe."
              >
                <form onSubmit={handleCreateAccess} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <Input 
                      placeholder="Prénom" 
                      value={formData.firstname}
                      onChange={e => setFormData(p => ({ ...p, firstname: e.target.value }))}
                      required 
                    />
                    <Input 
                      placeholder="Nom" 
                      value={formData.lastname}
                      onChange={e => setFormData(p => ({ ...p, lastname: e.target.value }))}
                      required 
                    />
                    <Input 
                      placeholder="Entreprise (Optionnel)" 
                      value={formData.company}
                      onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: colors.background, padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}` }}>
                    <div>
                      <span style={{ fontSize: 12, color: colors.textMid, display: 'block', marginBottom: 4 }}>Aperçu de l'Identifiant (Access ID) :</span>
                      <strong style={{ fontSize: 15, color: colors.green }}>{previewId}</strong>
                    </div>
                    <Button type="submit" variant="primary" disabled={isSubmitting || previewId === '@entreprise'}>
                      {isSubmitting ? 'Création...' : 'Générer l\'accès'}
                    </Button>
                  </div>
                </form>
              </DataCard>

              {/* Liste des accès */}
              <DataCard title="Accès générés" subtitle={`${accesses.length} accès / 10 actifs`}>
                {loadingAccesses ? (
                  <LoadingState />
                ) : accesses.length === 0 ? (
                  <EmptyState title="Aucun accès" description="Vous n'avez pas encore généré d'accès pour votre équipe." icon="🔑" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {accesses.map(acc => (
                      <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, border: `1px solid ${colors.border}`, background: acc.status === 'revoked' ? colors.background : '#fff', opacity: acc.status === 'revoked' ? 0.7 : 1 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <strong style={{ fontSize: 15 }}>{acc.accessId}</strong>
                            <Badge variant={acc.status === 'active' ? 'success' : acc.status === 'revoked' ? 'danger' : 'default'}>
                              {acc.status === 'active' ? 'Actif' : acc.status === 'revoked' ? 'Révoqué' : 'En attente'}
                            </Badge>
                          </div>
                          <div style={{ fontSize: 13, color: colors.textMid }}>
                            {acc.firstname} {acc.lastname} — {acc.company}
                            {acc.email ? ` (${acc.email})` : ''}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {acc.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => copyId(acc.accessId)}>Copier ID</Button>
                          )}
                          {acc.status !== 'revoked' && (
                            <Button size="sm" variant="ghost" onClick={() => revokeAccess(acc.id)} style={{ color: colors.error }}>Révoquer</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DataCard>
            </div>
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
