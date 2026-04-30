import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/utils/logger'

export const statsService = {
  async getTotalUsers(): Promise<number> {
    try {
      const db = getFirestore()
      const snapshot = await getDocs(collection(db, 'users'))
      return snapshot.size
    } catch (error) {
      logger.error('getTotalUsers error:', error)
      return 0
    }
  },

  async getTotalCompanies(): Promise<number> {
    try {
      const db = getFirestore()
      const snapshot = await getDocs(collection(db, 'companies'))
      return snapshot.size
    } catch (error) {
      logger.error('getTotalCompanies error:', error)
      return 0
    }
  },

  async getTotalPipelineItems(): Promise<number> {
    try {
      const db = getFirestore()
      const snapshot = await getDocs(collection(db, 'pipeline'))
      return snapshot.size
    } catch (error) {
      logger.error('getTotalPipelineItems error:', error)
      return 0
    }
  },

  async getTotalSearchesToday(): Promise<number> {
    try {
      const db = getFirestore()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startOfDay = Timestamp.fromDate(today)

      const q = query(
        collection(db, 'usage_logs'),
        where('type', '==', 'search'),
        where('timestamp', '>=', startOfDay)
      )
      const snapshot = await getDocs(q)
      return snapshot.size
    } catch (error) {
      logger.error('getTotalSearchesToday error:', error)
      return 0
    }
  },

  async getActiveUsers(): Promise<number> {
    try {
      const db = getFirestore()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const startDate = Timestamp.fromDate(sevenDaysAgo)

      const q = query(
        collection(db, 'users'),
        where('lastLogin', '>=', startDate)
      )
      const snapshot = await getDocs(q)
      return snapshot.size
    } catch (error) {
      logger.error('getActiveUsers error:', error)
      return 0
    }
  },

  async getNewUsersThisWeek(): Promise<number> {
    try {
      const db = getFirestore()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const startDate = Timestamp.fromDate(sevenDaysAgo)

      const q = query(
        collection(db, 'users'),
        where('createdAt', '>=', startDate)
      )
      const snapshot = await getDocs(q)
      return snapshot.size
    } catch (error) {
      logger.error('getNewUsersThisWeek error:', error)
      return 0
    }
  },

  async getPipelineMetrics() {
    try {
      const db = getFirestore()
      const snapshot = await getDocs(collection(db, 'pipeline'))

      const metrics = {
        total: snapshot.size,
        prospection: 0,
        negotiation: 0,
        conclusion: 0,
        lost: 0,
      }

      snapshot.forEach((doc) => {
        const status = doc.data().status as string
        if (status === 'prospection') metrics.prospection++
        else if (status === 'negotiation') metrics.negotiation++
        else if (status === 'conclusion') metrics.conclusion++
        else if (status === 'lost') metrics.lost++
      })

      return metrics
    } catch (error) {
      logger.error('getPipelineMetrics error:', error)
      return { total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0 }
    }
  },

  async getTeamPerformance(teamId?: string) {
    try {
      const db = getFirestore()
      let q

      if (teamId) {
        q = query(
          collection(db, 'pipeline'),
          where('managerUid', '==', teamId)
        )
      } else {
        q = query(collection(db, 'pipeline'))
      }

      const snapshot = await getDocs(q)

      const performance = {
        totalItems: snapshot.size,
        closed: 0,
        conversionRate: 0,
        lastWeekItems: 0,
      }

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const startDate = Timestamp.fromDate(oneWeekAgo)

      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.status === 'conclusion') performance.closed++
        if (data.createdAt >= startDate) performance.lastWeekItems++
      })

      performance.conversionRate =
        performance.totalItems > 0
          ? Math.round((performance.closed / performance.totalItems) * 100)
          : 0

      return performance
    } catch (error) {
      logger.error('getTeamPerformance error:', error)
      return {
        totalItems: 0,
        closed: 0,
        conversionRate: 0,
        lastWeekItems: 0,
      }
    }
  },

  async getDashboardStats() {
    try {
      const [
        totalUsers,
        totalCompanies,
        totalPipelineItems,
        totalSearchesToday,
        activeUsers,
        newUsersThisWeek,
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getTotalCompanies(),
        this.getTotalPipelineItems(),
        this.getTotalSearchesToday(),
        this.getActiveUsers(),
        this.getNewUsersThisWeek(),
      ])

      return {
        totalUsers,
        totalCompanies,
        totalPipelineItems,
        totalSearchesToday,
        activeUsers,
        newUsersThisWeek,
      }
    } catch (error) {
      logger.error('getDashboardStats error:', error)
      return {
        totalUsers: 0,
        totalCompanies: 0,
        totalPipelineItems: 0,
        totalSearchesToday: 0,
        activeUsers: 0,
        newUsersThisWeek: 0,
      }
    }
  }
}