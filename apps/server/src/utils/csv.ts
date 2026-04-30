export function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return []
  }

  const headers = splitCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })

    return row
  })
}

function splitCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())

  return result
}