'use client'

import { useState, useRef, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistantPage() {
  const { user } = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        '👋 Bonjour! Je suis votre Companion IA. Je peux vous aider avec des conseils commerciaux, des stratégies de prospection, et bien plus. Comment puis-je vous aider?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: input })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || errorData.error || `Failed to get response (${response.status})`
        )
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          data.reply ||
          data.response ||
          data.message ||
          "Désolé, je n'ai pas pu traiter votre demande.",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content:
          error instanceof Error
            ? `❌ Erreur: ${error.message}`
            : '❌ Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--foreground, #f1f5f9)' }}>
        ⏳ Chargement...
      </div>
    )
  }

  if (user.plan === 'free') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--background, #0b1120)',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--foreground, #f1f5f9)'
        }}
      >
        <div className="hero-glow-tl" style={{ opacity: 0.15 }} />
        <span style={{ fontSize: '4rem', marginBottom: '20px', display: 'block', animation: 'floatSubtle 6s infinite ease-in-out' }}>🤖</span>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', fontFamily: "'Syne', sans-serif" }}>
          Companion IA Commercial
        </h1>
        <p style={{ maxWidth: '400px', color: 'var(--muted-foreground, #94a3b8)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          L&apos;assistant de prospection intelligent est réservé aux abonnements payants. Boostez vos ventes en générant des emails et scripts d&apos;approche sur-mesure pour le marché camerounais.
        </p>
        <a
          href="/upgrade"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'var(--color-primary)',
            color: 'white',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(55,138,221,0.25)',
            transition: 'all 200ms ease'
          }}
        >
          🚀 Voir les abonnements
        </a>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--background, #0b1120)',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
          background: 'var(--card, #131c2e)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
            Companion IA
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground, #94a3b8)' }}>
            Conseils commerciaux en temps réel
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingBottom: '100px'
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '8px',
              animation: 'fadeUp 300ms ease-out forwards'
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user' ? '#22c55e' : 'var(--card, #131c2e)',
                color: msg.role === 'user' ? 'white' : 'var(--foreground, #f1f5f9)',
                fontSize: '14px',
                lineHeight: '1.5',
                wordBreak: 'break-word'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              gap: '8px'
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--card, #131c2e)',
                color: 'var(--muted-foreground, #94a3b8)',
                fontSize: '14px'
              }}
            >
              ⏳ Réflexion en cours...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'var(--card, #131c2e)',
          borderTop: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
          display: 'flex',
          gap: '8px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))'
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question..."
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            background: 'var(--background, #0b1120)',
            color: 'var(--foreground, #f1f5f9)',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'none',
            maxHeight: '60px',
            outline: 'none'
          }}
          rows={1}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: input.trim() && !loading ? '#22c55e' : 'var(--muted-foreground, #64748b)',
            color: 'white',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'all 200ms ease'
          }}
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
