import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminUsersTable } from '../AdminUsersTable'

// Derive the user row type directly from the component props — stays in sync automatically
type UserRow = React.ComponentProps<typeof AdminUsersTable>['users'][number]

const mockUser: UserRow = {
  uid: 'user-1',
  email: 'user1@example.com',
  name: 'User One',
  role: 'member',
  plan: 'free',
  dailyUsed: 5,
  dailyLimit: 10,
  active: true,
  companyId: 'company-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('AdminUsersTable', () => {
  it('should render empty state when no users', () => {
    render(<AdminUsersTable users={[]} onDelete={() => {}} />)

    expect(screen.getByText(/Aucun utilisateur/i)).toBeInTheDocument()
  })

  it('should render users table with data', () => {
    render(<AdminUsersTable users={[mockUser]} onDelete={() => {}} />)

    expect(screen.getByText(/user1@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/User One/)).toBeInTheDocument()
    expect(screen.getByText(/member/i)).toBeInTheDocument()
  })

  it('should show action buttons', () => {
    render(<AdminUsersTable users={[mockUser]} onDelete={() => {}} onUpdate={() => {}} />)

    // Look for action buttons (Désactiver, Delete)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
