'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'

type Props = { onSend: (content: string) => Promise<void> }

export function SupportComposer({ onSend }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!content.trim()) return
    setLoading(true)
    try {
      await onSend(content.trim())
      setContent('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Votre message…"
        rows={3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSend()
        }}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          color: colors.text,
          fontFamily: 'inherit',
          outline: 'none',
          resize: 'none',
          lineHeight: 1.55,
        }}
      />
      <Button
        variant="primary"
        size="md"
        loading={loading}
        disabled={!content.trim()}
        onClick={() => void handleSend()}
        style={{ flexShrink: 0 }}
      >
        Envoyer
      </Button>
    </div>
  )
}
