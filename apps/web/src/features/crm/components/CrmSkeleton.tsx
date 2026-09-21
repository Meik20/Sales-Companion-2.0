'use client'

export function CrmSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1.4fr_1fr_1.2fr_1.2fr_1.4fr] border-b border-border px-5 py-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 rounded-full bg-secondary animate-pulse" style={{ width: `${50 + i * 10}%` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[2fr_1.4fr_1fr_1.2fr_1.2fr_1.4fr] border-b border-border px-5 py-4 gap-3 items-center"
          style={{ borderBottomColor: i === rows - 1 ? 'transparent' : undefined }}
        >
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-2/3 rounded-full bg-secondary animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            <div className="h-2.5 w-1/2 rounded-full bg-secondary/60 animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          </div>
          <div className="h-3 w-3/4 rounded-full bg-secondary animate-pulse" style={{ animationDelay: `${i * 60 + 10}ms` }} />
          <div className="h-3 w-2/3 rounded-full bg-secondary/70 animate-pulse" style={{ animationDelay: `${i * 60 + 20}ms` }} />
          <div className="h-5 w-20 rounded-full bg-secondary animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          <div className="h-3 w-4/5 rounded-full bg-secondary/60 animate-pulse" style={{ animationDelay: `${i * 60 + 40}ms` }} />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-8 w-8 rounded-lg bg-secondary animate-pulse" style={{ animationDelay: `${i * 60 + j * 20}ms` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CrmMobileSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-1/2 rounded-full bg-secondary" />
            <div className="h-5 w-20 rounded-full bg-secondary" />
          </div>
          <div className="h-3 w-1/3 rounded-full bg-secondary/70" />
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded-lg bg-secondary" />
            <div className="h-8 flex-1 rounded-lg bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  )
}
