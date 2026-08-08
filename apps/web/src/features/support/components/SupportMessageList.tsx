
type Message = {
  id: string
  content: string
  senderId: string
  senderRole?: string
  createdAt?: unknown
}

type Props = {
  messages: Message[]
  currentUserId?: string
}

export function SupportMessageList({ messages, currentUserId }: Props) {
  if (!messages.length) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--muted-foreground, #94a3b8)', fontSize: 13, padding: '24px 0' }}>
        Aucun message — commencez la conversation ci-dessous.
      </p>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 400,
        overflowY: 'auto',
        padding: 4
      }}
    >
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUserId
        const isAdmin = msg.senderRole === 'admin'

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: isMe ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isMe
                  ? 'rgba(27,122,62,0.25)'
                  : isAdmin
                    ? 'rgba(245,166,35,0.12)'
                    : colors.bg4,
                border: `1px solid ${isMe ? 'rgba(46,160,90,0.3)' : isAdmin ? 'rgba(245,166,35,0.25)' : 'var(--border, rgba(255,255,255,0.1))'}`,
                fontSize: 13,
                color: 'var(--foreground, #f1f5f9)',
                lineHeight: 1.55
              }}
            >
              {isAdmin && !isMe ? (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#F5A623',
                    marginBottom: 4,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  Support
                </div>
              ) : null}
              {msg.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
