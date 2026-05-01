import { useState, useEffect } from 'react'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState, LoadingState } from '@/components/feedback/index'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

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

export function TeamAccessManager() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  const [accesses, setAccesses] = useState<any[]>([])
  const [loadingAccesses, setLoadingAccesses] = useState(false)
  const [formData, setFormData] = useState({ firstname: '', lastname: '', company: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewId = buildAccessId(formData.firstname, formData.lastname, formData.company || user?.companyName || 'Entreprise')

  const loadAccesses = async () => {
    if (!user || user.role !== 'manager') return;
    setLoadingAccesses(true)
    try {
      const q = query(collection(db, 'team_accesses'), where('createdBy', '==', user.uid))
      const snap = await getDocs(q)
      setAccesses(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()))
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    } finally {
      setLoadingAccesses(false)
    }
  }

  useEffect(() => {
    loadAccesses()
  }, [user])

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
      pushToast({ type: 'success', title: `Accès créé ! ID: ${accessId}` })
      setFormData({ firstname: '', lastname: '', company: '' })
      loadAccesses()
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id)
    pushToast({ type: 'info', title: `ID copié: ${id}` })
  }

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
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    }
  }

  if (user?.role !== 'manager') return null

  return (
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
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: colors.bg2, padding: '12px 16px', borderRadius: 8, border: `1px solid ${colors.border}` }}>
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

      <DataCard title="Accès générés" subtitle={`${accesses.length} accès au total`}>
        {loadingAccesses ? (
          <LoadingState />
        ) : accesses.length === 0 ? (
          <EmptyState title="Aucun accès" description="Vous n'avez pas encore généré d'accès pour votre équipe." icon="🔑" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {accesses.map(acc => (
              <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, border: `1px solid ${colors.border}`, background: acc.status === 'revoked' ? colors.bg2 : '#fff', opacity: acc.status === 'revoked' ? 0.7 : 1 }}>
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
                    <Button size="sm" variant="ghost" onClick={() => revokeAccess(acc.id)} style={{ color: '#EF4444' }}>Révoquer</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </div>
  )
}
