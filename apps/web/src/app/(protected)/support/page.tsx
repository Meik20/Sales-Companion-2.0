'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState } from '@/components/feedback/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SupportThreadList } from '@/features/support/components/SupportThreadList'
import { SupportMessageList } from '@/features/support/components/SupportMessageList'
import { SupportComposer } from '@/features/support/components/SupportComposer'
import { createSupportThread } from '@/features/support/hooks/useCreateSupportThread'
import { useSupportMessages } from '@/features/support/hooks/useSupportMessages'
import { useUserSupportThreads } from '@/features/support/hooks/useUserSupportThreads'
import { sendSupportMessage } from '@/features/support/hooks/useSendSupportMessage'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'

export default function SupportPage() {
  const { user } = useCurrentUser()
  const { threads } = useUserSupportThreads(user?.uid)
  const { pushToast } = useToast()

  const [subject,          setSubject]          = useState('')
  const [type,             setType]             = useState<'chat' | 'ticket'>('chat')
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>()
  const [creating,         setCreating]         = useState(false)
  const [showNew,          setShowNew]          = useState(false)

  const { messages } = useSupportMessages(selectedThreadId)

  async function handleCreateThread() {
    if (!user || !subject.trim()) return
    setCreating(true)
    try {
      const docRef = await createSupportThread({
        userId:    user.uid,
        userEmail: user.email,
        userName:  user.name,
        subject:   subject.trim(),
        type,
      })
      setSelectedThreadId(docRef.id)
      setSubject('')
      setShowNew(false)
      pushToast({ type: 'success', title: 'Ticket créé' })
    } catch {
      pushToast({ type: 'error', title: 'Création impossible' })
    } finally {
      setCreating(false)
    }
  }

  async function handleSendMessage(content: string) {
    if (!user || !selectedThreadId) return
    await sendSupportMessage({
      threadId:   selectedThreadId,
      senderId:   user.uid,
      senderRole: 'user',
      content,
    })
  }

  return (
    <AppShell>
      <PageHeader
        title="Support"
        subtitle="Posez vos questions et suivez vos tickets."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNew((v) => !v)}>
            {showNew ? '✕ Annuler' : '+ Nouveau ticket'}
          </Button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Créer un nouveau ticket */}
        {showNew ? (
          <DataCard title="Nouveau ticket">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Sujet" required>
                <Input
                  placeholder="Décrivez votre problème en quelques mots…"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </FormField>

              <FormField label="Type">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['chat', 'ticket'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        border: `1px solid ${type === t ? 'rgba(46,160,90,0.5)' : colors.border}`,
                        background: type === t ? 'rgba(27,122,62,0.15)' : 'transparent',
                        color: type === t ? colors.greenMid : colors.textMid,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 200ms ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>

              <div>
                <Button
                  variant="primary"
                  size="md"
                  loading={creating}
                  onClick={() => void handleCreateThread()}
                  disabled={!subject.trim()}
                >
                  Créer le ticket
                </Button>
              </div>
            </div>
          </DataCard>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: threads?.length ? '280px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
          {/* Liste des threads */}
          {threads?.length ? (
            <DataCard title="Mes tickets">
              <SupportThreadList
                threads={threads}
                selectedId={selectedThreadId}
                onSelect={setSelectedThreadId}
              />
            </DataCard>
          ) : null}

          {/* Messages du thread sélectionné */}
          {selectedThreadId ? (
            <DataCard title="Conversation">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SupportMessageList messages={messages ?? []} currentUserId={user?.uid} />
                <SupportComposer onSend={handleSendMessage} />
              </div>
            </DataCard>
          ) : (
            !showNew && (
              <DataCard title="Support">
                <EmptyState
                  title="Aucune conversation"
                  description='Créez un nouveau ticket pour contacter le support.'
                  icon="💬"
                />
              </DataCard>
            )
          )}
        </div>
      </div>
    </AppShell>
  )
}
