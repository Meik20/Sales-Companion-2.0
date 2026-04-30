import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminStatsCards } from '../AdminStatsCards'

describe('AdminStatsCards', () => {
  it('should render stats cards with data', () => {
    const mockStats = {
      totalUsers: 100,
      totalCompanies: 500,
      totalPipelineItems: 1000,
      activeUsers: 75,
      newUsersThisWeek: 12,
    }

    render(<AdminStatsCards stats={mockStats} />)

    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
    expect(screen.getByText(/Entreprises/i)).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('should render with default values for missing data', () => {
    const mockStats = {}

    render(<AdminStatsCards stats={mockStats} />)

    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument()
    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it('should display active users hint when available', () => {
    const mockStats = {
      totalUsers: 100,
      activeUsers: 75,
    }

    render(<AdminStatsCards stats={mockStats} />)

    expect(screen.getByText(/75 actifs/)).toBeInTheDocument()
  })
})
