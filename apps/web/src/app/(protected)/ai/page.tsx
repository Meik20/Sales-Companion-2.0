'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { useTranslation } from '@/providers/I18nProvider'
import { COUNTRY_FRENCH_IN, COUNTRY_FRENCH_MARKET_ADJECTIVE, COUNTRY_NAMES, type CountryCode } from '@sales-companion/shared'
import { Loader2, RotateCcw } from 'lucide-react'
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistantPage() {
  const { user } = useCurrentUser()
  const { lang, t } = useTranslation()
  const countryCode = useProspectingCountry()
  const countryName = COUNTRY_NAMES[countryCode] || 'Cameroun'
  const countryIn = COUNTRY_FRENCH_IN[countryCode] || 'au Cameroun'
  const countryAdjective = COUNTRY_FRENCH_MARKET_ADJECTIVE[countryCode] || 'camerounais'
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const getGreetingMessage = useCallback((): Message => ({
    id: 'welcome-msg',
    role: 'assistant',
    content:
      lang === 'en'
        ? '👋 Hello! I am your AI Sales Companion 2.0. I can help you with B2B prospecting, finding companies in our database, and drafting outreach pitches. How can I help you today?'
        : `👋 Bonjour ! Je suis votre Companion IA. Je peux vous aider avec des conseils commerciaux, la recherche d'entreprises dans la base et la prospection B2B ${countryIn}. Comment puis-je vous aider ?`,
    timestamp: new Date()
  }), [lang, countryIn])

  // Load chat history from Firestore on user load
  useEffect(() => {
    if (!user?.uid) return
    let isMounted = true

    async function loadHistory() {
      try {
        const q = query(
          collection(firestore, 'ai_conversations', user!.uid, 'messages'),
          orderBy('createdAt', 'asc'),
          limit(50)
        )
        const snap = await getDocs(q)
        if (!isMounted) return

        if (!snap.empty) {
          const loaded: Message[] = snap.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              role: data.role as 'user' | 'assistant',
              content: data.content,
              timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
            }
          })
          setMessages(loaded)
        } else {
          setMessages([getGreetingMessage()])
        }
      } catch (err) {
        console.warn('[AI] Could not load chat history from Firestore:', err)
        if (isMounted) setMessages([getGreetingMessage()])
      } finally {
        if (isMounted) setInitialLoading(false)
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [user?.uid, getGreetingMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const resetChat = async () => {
    setMessages([getGreetingMessage()])
    setInput('')
    setLoading(false)

    if (user?.uid) {
      try {
        const snap = await getDocs(
          query(collection(firestore, 'ai_conversations', user.uid, 'messages'), limit(100))
        )
        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref))
        await Promise.all(deletePromises)
      } catch (err) {
        console.warn('[AI] Error clearing conversation history in Firestore:', err)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user) return

    const trimmedInput = input.trim()

    // Add user message locally
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Persist user message to Firestore
    addDoc(collection(firestore, 'ai_conversations', user.uid, 'messages'), {
      role: 'user',
      content: trimmedInput,
      createdAt: serverTimestamp()
    }).catch((err) => console.warn('[AI] Could not persist user message:', err))

    try {
      const token = await user.getIdToken()
      const recentHistory = messages
        .filter((m) => m.id !== 'welcome-msg' && m.id !== '1')
        .slice(-6)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: trimmedInput, lang, history: recentHistory, country: countryCode })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || errorData.error || `Failed to get response (${response.status})`
        )
      }

      const data = await response.json()
      const assistantContent =
        data.reply ||
        data.response ||
        data.message ||
        "Désolé, je n'ai pas pu traiter votre demande."

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Persist assistant reply to Firestore
      addDoc(collection(firestore, 'ai_conversations', user.uid, 'messages'), {
        role: 'assistant',
        content: assistantContent,
        createdAt: serverTimestamp()
      }).catch((err) => console.warn('[AI] Could not persist assistant message:', err))
    } catch (error) {
      console.error('AI Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content:
          error instanceof Error
            ? `Erreur: ${error.message}`
            : 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (!user || initialLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--foreground, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Loader2 size={18} className="animate-spin text-primary" />
        <span>Chargement...</span>
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
          L&apos;assistant de prospection intelligent est réservé aux abonnements payants. Boostez vos ventes en générant des emails et scripts d&apos;approche sur-mesure pour le marché {countryAdjective}.
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
          padding: '16px 20px',
          borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
          background: 'var(--card, #131c2e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
            {lang === 'en' ? 'AI Sales Companion 2.0' : 'Companion IA'}
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground, #94a3b8)' }}>
            {lang === 'en' ? 'Real-time sales insights & prospecting' : 'Conseils commerciaux et prospection en temps réel'}
          </p>
        </div>

        {messages.some((m) => m.role === 'user') && (
          <button
            type="button"
            onClick={resetChat}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title={lang === 'en' ? 'Reset conversation' : 'Nouvelle conversation'}
          >
            <RotateCcw size={13} className="transition-transform active:-rotate-45" />
            <span>{lang === 'en' ? 'New chat' : 'Nouvelle conversation'}</span>
          </button>
        )}
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
                background: msg.role === 'user' ? '#2563eb' : 'var(--card, #131c2e)',
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
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Loader2 size={15} className="animate-spin text-primary shrink-0" />
              <span>{lang === 'en' ? 'Searching database & thinking...' : 'Recherche dans la base & réflexion...'}</span>
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
          placeholder={
            lang === 'en'
              ? 'Ask for companies, email pitches, sales advice...'
              : 'Demandez des entreprises, un pitch email, des conseils...'
          }
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
            background: input.trim() && !loading ? '#2563eb' : 'var(--muted-foreground, #64748b)',
            color: 'white',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'all 200ms ease'
          }}
        >
          {lang === 'en' ? 'Send' : 'Envoyer'}
        </button>
      </form>
    </div>
  )
}
