import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'

describe('csv', () => {
  it('parses basic csv content', () => {
    const content = `name,city
Acme,Douala
Nova,Yaounde`

    const rows = parseCsv(content)

    expect(rows).toHaveLength(2)
    expect(rows[0]!.name).toBe('Acme')
    expect(rows[0]!.city).toBe('Douala')
    expect(rows[1]!.name).toBe('Nova')
  })
})
