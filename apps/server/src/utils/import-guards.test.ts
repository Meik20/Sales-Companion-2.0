import { describe, expect, it } from 'vitest'
import {
  assertAllowedImportFilename,
  assertImportHeadersLimit,
  assertImportRowsLimit
} from './import-guards'

describe('import-guards', () => {
  it('accepts csv/xlsx/xls', () => {
    expect(() => assertAllowedImportFilename('file.csv')).not.toThrow()
    expect(() => assertAllowedImportFilename('file.xlsx')).not.toThrow()
    expect(() => assertAllowedImportFilename('file.xls')).not.toThrow()
  })

  it('rejects unsupported extension', () => {
    expect(() => assertAllowedImportFilename('file.pdf')).toThrow()
  })

  it('rejects too many rows', () => {
    expect(() => assertImportRowsLimit(10001, 10000)).toThrow()
  })

  it('rejects too many headers', () => {
    expect(() => assertImportHeadersLimit(new Array(101).fill('x'), 100)).toThrow()
  })
})