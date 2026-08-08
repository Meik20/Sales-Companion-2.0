// ─── SupportThreadList ────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/index'

type Thread = {
  id: string
  subject: string
  type?: string
  status?: string
  createdAt?: unknown
}

type ThreadListProps = {
  threads: Thread[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function SupportThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread.id)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${selectedId === thread.id ? 'rgba(46,160,90,0.4)' : 'var(--border, rgba(255,255,255,0.1))'}`,
            background: selectedId === thread.id ? 'rgba(27,122,62,0.12)' : 'var(--secondary, #1e2a3b)',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'all 200ms ease'
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #f1f5f9)', marginBottom: 6 }}>
            {thread.subject}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {thread.type ? <Badge variant="info">{thread.type}</Badge> : null}
            {thread.status ? (
              <Badge variant={thread.status === 'open' ? 'success' : 'default'}>
                {thread.status}
              </Badge>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  )
}
