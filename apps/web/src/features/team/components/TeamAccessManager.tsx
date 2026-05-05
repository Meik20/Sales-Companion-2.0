import { useState, useEffect } from 'react'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState, LoadingState } from '@/components/feedback/index'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'
import { db } from '@/lib/firebase'
import { collection, query, where, doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { Trash2, Copy, Ban, ChevronDown } from 'lucide-react'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const previewId = buildAccessId(formData.firstname, formData.lastname, formData.company || user?.companyName || 'Entreprise')

  useEffect(() => {
    if (!user || user.role !== 'manager') return
    
    setLoadingAccesses(true)
    
    // Set up real-time listener for team accesses
    const q = query(collection(db, 'team_accesses'), where('managerUid', '==', user.uid))
    
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAccesses(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
        )
        setLoadingAccesses(false)
      },
      (error: any) => {
        pushToast({ type: 'error', title: `Erreur: ${error.message}` })
        setLoadingAccesses(false)
      }
    )
    
    // Clean up listener on unmount
    return () => unsubscribe()
  }, [user, pushToast])

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
        managerUid: user.uid,
        managerEmail: user.email,
        createdAt: serverTimestamp()
      })
      pushToast({ type: 'success', title: `Accès créé ! ID: ${accessId}` })
      setFormData({ firstname: '', lastname: '', company: '' })
      // Real-time listener will automatically update the list
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
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur: ${e.message}` })
    }
  }

  const deleteMember = async (accessId: string) => {
    if (!user) return
    setDeletingId(accessId)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/team/members/${encodeURIComponent(accessId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as any).message ?? `Erreur ${res.status}`)
      pushToast({ type: 'success', title: `Membre supprimé (${json.pipelineDeleted ?? 0} items pipeline retirés)` })
      setConfirmDeleteId(null)
      // Real-time listener updates the list automatically
    } catch (e: any) {
      pushToast({ type: 'error', title: `Erreur suppression: ${e.message}` })
    } finally {
      setDeletingId(null)
    }
  }

  if (user?.role !== 'manager') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accesses.map(acc => {
              const isActivated = acc.activated === true
              const isRevoked = acc.status === 'revoked'
              const isPendingEmail = acc.status === 'pending_email'
              const displayStatus = isRevoked ? 'revoked' : isActivated ? 'active' : isPendingEmail ? 'pending_email' : 'pending'
              const isConfirmingDelete = confirmDeleteId === acc.id
              const isDeleting = deletingId === acc.id

              return (
                <div key={acc.id} style={{ borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {/* Main row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: isRevoked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    opacity: isRevoked ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    flexWrap: 'wrap', gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14 }}>{acc.firstname} {acc.lastname}</strong>
                        <Badge variant={displayStatus === 'active' ? 'success' : displayStatus === 'revoked' ? 'danger' : 'default'}>
                          {displayStatus === 'active' ? 'Actif'
                            : displayStatus === 'revoked' ? 'Révoqué'
                            : displayStatus === 'pending_email' ? '⏳ Email en attente'
                            : 'En attente'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 11.5, color: colors.textMid, fontFamily: 'monospace' }}>
                        {acc.accessId}
                      </div>
                      {acc.email && (
                        <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>{acc.email}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Copy ID — only for pending */}
                      {displayStatus === 'pending' && (
                        <button
                          title="Copier l'identifiant d'accès"
                          onClick={() => copyId(acc.accessId)}
                          style={btnStyle('#185FA5')}
                        >
                          <Copy size={13} /> Copier
                        </button>
                      )}
                      {/* Revoke — only for non-revoked */}
                      {displayStatus !== 'revoked' && (
                        <button
                          title="Révoquer l'accès"
                          onClick={() => revokeAccess(acc.id)}
                          style={btnStyle('#EF9A3A')}
                        >
                          <Ban size={13} /> Révoquer
                        </button>
                      )}
                      {/* Delete — always available */}
                      <button
                        title="Supprimer définitivement"
                        onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : acc.id)}
                        style={btnStyle('#EF4444')}
                      >
                        <Trash2 size={13} /> Supprimer
                        <ChevronDown size={11} style={{ transform: isConfirmingDelete ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation panel — slides in below the row */}
                  {isConfirmingDelete && (
                    <div style={{
                      padding: '12px 14px',
                      background: 'rgba(239,68,68,0.06)',
                      borderTop: '1px solid rgba(239,68,68,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, flexWrap: 'wrap',
                      animation: 'slideDown 150ms ease',
                    }}>
                      <div style={{ fontSize: 13, color: '#EF4444', lineHeight: 1.5 }}>
                        <strong>Supprimer définitivement</strong> {acc.firstname} {acc.lastname} ?<br />
                        <span style={{ fontSize: 11.5, opacity: 0.8 }}>Son accès et son pipeline seront supprimés.</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setConfirmDeleteId(null)} style={btnStyle(colors.textMid)}>
                          Annuler
                        </button>
                        <button
                          onClick={() => void deleteMember(acc.id)}
                          disabled={isDeleting}
                          style={{ ...btnStyle('#EF4444'), background: 'rgba(239,68,68,0.12)', fontWeight: 700 }}
                        >
                          <Trash2 size={13} />
                          {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DataCard>
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    height: 28, padding: '0 10px', borderRadius: 7,
    border: `1px solid ${color}22`,
    background: `${color}11`,
    color,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  }
}
