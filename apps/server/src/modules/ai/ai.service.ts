import { logger } from '@/utils/logger'

type ProspectContext = {
  companyName?: string
  companySector?: string
  companyCity?: string
  lastInteraction?: string
  status?: string
  notes?: string
}

type SearchContext = {
  filters?: Record<string, unknown>
  resultCount?: number
  searchCriteria?: string
}

export const aiService = {
  async buildPitch(_prospect: ProspectContext) {
    try {
      return { pitch: 'Pitch genere' }
    } catch (error) {
      logger.error('AI buildPitch error:', error)
      return { pitch: 'Pitch par defaut' }
    }
  },

  async buildSearchSummary(_search: SearchContext) {
    try {
      return { summary: 'Resume de la recherche' }
    } catch (error) {
      logger.error('AI buildSearchSummary error:', error)
      return { summary: 'Resume par defaut' }
    }
  },

  async buildEmailTemplate(_prospect: ProspectContext) {
    try {
      return { subject: 'Opportunite', body: 'Corps de email' }
    } catch (error) {
      logger.error('AI buildEmailTemplate error:', error)
      return { subject: 'Opportunite', body: '' }
    }
  }
}
