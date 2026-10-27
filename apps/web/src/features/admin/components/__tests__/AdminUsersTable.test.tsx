import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminUsersTable } from '../AdminUsersTable'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

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

    expect(
      screen.getByText(/Aucun utilisateur|admin\.noUserMatch|team\.noUserMatch/i)
    ).toBeInTheDocument()
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

  it('renders Team Manager role badge and locks plan/quota in read-only mode', () => {
    const mockTm: UserRow = {
      uid: 'tm-1',
      email: 'tm@company.com',
      name: 'Team Manager One',
      role: 'manager',
      orgRole: 'team_manager',
      seniorManagerUid: 'sm-1',
      plan: 'enterprise',
      dailyUsed: 3,
      dailyLimit: 50,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    render(<AdminUsersTable users={[mockTm]} onDelete={() => {}} onUpdate={() => {}} />)

    // Role badge should be 'Team Manager'
    expect(screen.getByText('Team Manager')).toBeInTheDocument()

    // Plan should be rendered as read-only badge with title, not a select
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByTitle('Plan synchronisé et hérité du Senior Manager')).toBeInTheDocument()

    // Quota should not have number input
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })

  it('renders editable plan select for an independent manager or Senior Manager', () => {
    const mockSm: UserRow = {
      uid: 'sm-1',
      email: 'sm@company.com',
      name: 'Senior Manager One',
      role: 'manager',
      orgRole: 'senior_manager',
      plan: 'enterprise',
      dailyUsed: 0,
      dailyLimit: 50,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    render(<AdminUsersTable users={[mockSm]} onDelete={() => {}} onUpdate={() => {}} />)

    // Role badge should be 'Senior Manager'
    expect(screen.getByText('Senior Manager')).toBeInTheDocument()

    // Plan should have an editable select
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    // Quota should have an editable input
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })
})
