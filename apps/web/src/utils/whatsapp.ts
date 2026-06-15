/**
 * Format a phone number to WhatsApp international format.
 * Target market: Cameroon (+237).
 */
export function formatWhatsAppNumber(phone: string): string | null {
  if (!phone) return null

  // Remove all non-numeric characters (spaces, dashes, parentheses)
  let cleanNumber = phone.replace(/\D/g, '')

  // If already starts with 237 and has correct length (237 + 9 digits = 12)
  if (cleanNumber.startsWith('237') && cleanNumber.length === 12) {
    return cleanNumber
  }

  // If it's a local number (9 digits starting with 6, or with a leading 0)
  if (cleanNumber.length === 9 && cleanNumber.startsWith('6')) {
    return `237${cleanNumber}`
  }

  if (cleanNumber.length === 10 && cleanNumber.startsWith('06')) {
    return `237${cleanNumber.substring(1)}`
  }

  // Fallback: just return the cleaned number and hope it works
  // (e.g. if the user entered +33 6... for a french number)
  return cleanNumber
}

/**
 * Generate a WhatsApp Click-to-Chat URL.
 */
export function getWhatsAppUrl(phone: string, text?: string): string {
  const formatted = formatWhatsAppNumber(phone)
  const baseUrl = `https://wa.me/${formatted || phone.replace(/\D/g, '')}`
  
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`
  }
  return baseUrl
}
