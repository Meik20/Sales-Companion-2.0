export function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return []
  }

  // Détecter le séparateur : analyser le header pour trouver le plus fréquent
  // Supporter : virgule, point-virgule, tabulation, pipe, tilde
  const headerLine = lines[0] || ''
  let sep = ','

  // Compter les occurrences de chaque séparateur potentiel
  const separators = [',', ';', '\t', '|', '~']
  let maxCount = 0
  for (const s of separators) {
    const regex = new RegExp(`\\${s}`, 'g')
    const count = (headerLine.match(regex) || []).length
    if (count > maxCount) {
      maxCount = count
      sep = s
    }
  }

  const headers = splitCsvLine(headerLine, sep)

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, sep)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })

    return row
  })
}

function splitCsvLine(line: string, sep: string = ',') {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === sep && !insideQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())

  return result
}
