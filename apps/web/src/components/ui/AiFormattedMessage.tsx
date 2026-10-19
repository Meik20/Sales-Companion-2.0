'use client'

import React, { useMemo } from 'react'

interface AiFormattedMessageProps {
  content: string
  className?: string
}

/**
 * Nettoie les artefacts de syntaxe mathématique ou d'échappement brut.
 */
function cleanRawSyntax(text: string): string {
  return text
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\$\\leftarrow\$/g, '←')
    .replace(/\\leftarrow/g, '←')
    .replace(/\$\\times\$/g, '×')
    .replace(/\$\\bullet\$/g, '•')
    .replace(/\$\\pm\$/g, '±')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
}

/**
 * Rendu inline pour le gras, l'italique et le code inline
 */
function renderInline(text: string): React.ReactNode {
  // Regex pour découper par **gras**, *italique*, `code`
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-muted text-[11.5px] font-mono border border-border/50 text-foreground"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export function AiFormattedMessage({ content, className = '' }: AiFormattedMessageProps) {
  const elements = useMemo(() => {
    const cleaned = cleanRawSyntax(content || '')
    const lines = cleaned.split('\n')
    const nodes: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i] ?? ''
      const trimmed = line.trim()

      // Ligne vide
      if (!trimmed) {
        i++
        continue
      }

      // Séparateur horizontal (---)
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        nodes.push(<hr key={`hr-${i}`} className="my-3.5 border-t border-border/70" />)
        i++
        continue
      }

      // Titres H4 (####)
      if (trimmed.startsWith('#### ')) {
        nodes.push(
          <h4
            key={`h4-${i}`}
            className="text-[13px] font-bold text-foreground mt-3 mb-1 tracking-tight flex items-center gap-1.5"
          >
            {renderInline(trimmed.replace(/^####\s+/, ''))}
          </h4>
        )
        i++
        continue
      }

      // Titres H3 (###)
      if (trimmed.startsWith('### ')) {
        nodes.push(
          <h3
            key={`h3-${i}`}
            className="text-[14.5px] font-extrabold text-foreground mt-3.5 mb-1.5 tracking-tight font-heading flex items-center gap-2 border-b border-border/40 pb-1"
          >
            {renderInline(trimmed.replace(/^###\s+/, ''))}
          </h3>
        )
        i++
        continue
      }

      // Titres H2 / H1 (# / ##)
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
        nodes.push(
          <h2
            key={`h2-${i}`}
            className="text-[16px] font-extrabold text-foreground mt-4 mb-2 tracking-tight font-heading"
          >
            {renderInline(trimmed.replace(/^#{1,2}\s+/, ''))}
          </h2>
        )
        i++
        continue
      }

      // Tableau Markdown (| col | col |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = []
        while (i < lines.length) {
          const cur = lines[i]
          if (!cur) break
          const curTrimmed = cur.trim()
          if (!curTrimmed.startsWith('|') || !curTrimmed.endsWith('|')) break
          tableLines.push(curTrimmed)
          i++
        }

        const firstTableLine = tableLines[0]
        if (tableLines.length >= 2 && firstTableLine) {
          const headerRow = firstTableLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
          // Sauter la ligne de séparation |---|---|
          const bodyRows = tableLines.slice(2).map((r) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          )

          nodes.push(
            <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-[12px] border-collapse bg-card">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    {headerRow.map((h, colIdx) => (
                      <th key={colIdx} className="px-3 py-2 font-bold text-foreground">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bodyRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-foreground/90 align-top">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          continue
        }
      }

      // Liste à puces (* / - / •)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const listItems: string[] = []
        while (i < lines.length) {
          const cur = lines[i]
          if (!cur) break
          const curTrimmed = cur.trim()
          if (
            !curTrimmed.startsWith('* ') &&
            !curTrimmed.startsWith('- ') &&
            !curTrimmed.startsWith('• ')
          ) {
            break
          }
          listItems.push(curTrimmed.replace(/^(\*|-|•)\s+/, ''))
          i++
        }

        nodes.push(
          <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-1.5">
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <span className="text-primary mt-1 text-[8px] flex-shrink-0">●</span>
                <span className="flex-1 text-foreground/95">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        )
        continue
      }

      // Liste numérotée (1. / 2.)
      if (/^\d+\.\s+/.test(trimmed)) {
        const numItems: string[] = []
        while (i < lines.length) {
          const cur = lines[i]
          if (!cur) break
          const curTrimmed = cur.trim()
          if (!/^\d+\.\s+/.test(curTrimmed)) break
          numItems.push(curTrimmed.replace(/^\d+\.\s+/, ''))
          i++
        }

        nodes.push(
          <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1.5">
            {numItems.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2 text-[13px] leading-relaxed">
                <span className="font-bold text-primary flex-shrink-0 text-xs mt-0.5">
                  {itemIdx + 1}.
                </span>
                <span className="flex-1 text-foreground/95">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        )
        continue
      }

      // Paragraphe standard
      nodes.push(
        <p key={`p-${i}`} className="my-1.5 text-[13px] leading-relaxed text-foreground/95">
          {renderInline(trimmed)}
        </p>
      )
      i++
    }

    return nodes
  }, [content])

  return <div className={`space-y-1 text-left ${className}`}>{elements}</div>
}
