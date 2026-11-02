import { describe, it, expect } from 'vitest'
import {
  formatWhatsAppNumber,
  getWhatsAppUrl,
  getWhatsAppSalesMessage,
  WHATSAPP_SALES_SCRIPTS
} from '../whatsapp'

describe('WhatsApp Multi-Country & Sales Scripts Utility', () => {
  describe('formatWhatsAppNumber', () => {
    it('normalizes Cameroon numbers dynamically', () => {
      expect(formatWhatsAppNumber('699001122', 'CM')).toBe('237699001122')
      expect(formatWhatsAppNumber('+237 699 00 11 22', 'CM')).toBe('237699001122')
      expect(formatWhatsAppNumber('237699001122', 'CM')).toBe('237699001122')
    })

    it('normalizes Senegal numbers (+221)', () => {
      expect(formatWhatsAppNumber('771234567', 'SN')).toBe('221771234567')
      expect(formatWhatsAppNumber('+221 77 123 45 67', 'SN')).toBe('221771234567')
      expect(formatWhatsAppNumber('221771234567', 'SN')).toBe('221771234567')
    })

    it('normalizes Ivory Coast numbers (+225) including local leading 0', () => {
      expect(formatWhatsAppNumber('0701020304', 'CI')).toBe('225701020304')
      expect(formatWhatsAppNumber('+225 07 01 02 03 04', 'CI')).toBe('2250701020304')
    })

    it('normalizes Benin numbers (+229) and Togo (+228)', () => {
      expect(formatWhatsAppNumber('97123456', 'BJ')).toBe('22997123456')
      expect(formatWhatsAppNumber('90123456', 'TG')).toBe('22890123456')
    })

    it('preserves international numbers with explicit +', () => {
      expect(formatWhatsAppNumber('+33 6 12 34 56 78')).toBe('33612345678')
      expect(formatWhatsAppNumber('+1 555 123 4567')).toBe('15551234567')
    })

    it('handles empty or invalid inputs safely', () => {
      expect(formatWhatsAppNumber('')).toBeNull()
      expect(formatWhatsAppNumber(null as any)).toBeNull()
      expect(formatWhatsAppNumber('   ')).toBeNull()
    })
  })

  describe('getWhatsAppUrl', () => {
    it('creates a proper click-to-chat URL with country code and encoded message', () => {
      const url = getWhatsAppUrl('771234567', 'Bonjour test!', 'SN')
      expect(url).toBe('https://wa.me/221771234567?text=Bonjour%20test!')
    })

    it('creates a clean URL without message parameter when text is omitted', () => {
      const url = getWhatsAppUrl('699001122', undefined, 'CM')
      expect(url).toBe('https://wa.me/237699001122')
    })
  })

  describe('getWhatsAppSalesMessage', () => {
    it('generates an intro script in French and English with personalized parameters', () => {
      const fr = getWhatsAppSalesMessage('intro', {
        companyName: 'Boulangerie Moderne',
        contactName: 'M. Dupont',
        salespersonName: 'Paul'
      }, 'fr')
      expect(fr).toContain('Paul')
      expect(fr).toContain('M. Dupont')
      expect(fr).toContain('Boulangerie Moderne')
      expect(fr).toContain('5 min')

      const en = getWhatsAppSalesMessage('intro', {
        companyName: 'Acme Corp',
        contactName: 'John',
        salespersonName: 'Alice'
      }, 'en')
      expect(en).toContain('Alice')
      expect(en).toContain('John')
      expect(en).toContain('Acme Corp')
    })

    it('generates quote, followup, and stagnant scripts', () => {
      const quote = getWhatsAppSalesMessage('quote', { companyName: 'BTP Plus' }, 'fr')
      expect(quote).toContain('proposition commerciale')

      const followup = getWhatsAppSalesMessage('followup', { companyName: 'BTP Plus' }, 'fr')
      expect(followup).toContain('revenir vers vous')

      const stagnant = getWhatsAppSalesMessage('stagnant', { companyName: 'BTP Plus' }, 'fr')
      expect(stagnant).toContain('toujours d\'actualité')
    })

    it('defines 4 standard sales scripts metadata', () => {
      expect(WHATSAPP_SALES_SCRIPTS).toHaveLength(4)
      expect(WHATSAPP_SALES_SCRIPTS.map((s) => s.id)).toEqual(['intro', 'quote', 'followup', 'stagnant'])
    })
  })
})

