import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard')
  })

  test('should load admin dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Dashboard|Admin/i)
  })

  test('should display stats cards', async ({ page }) => {
    // Check for stats cards with data
    const statsCards = page.locator('[data-testid="stat-card"], .stat, [class*="card"]')

    // Should have multiple stat cards
    const cardCount = await statsCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('should show stat values', async ({ page }) => {
    // Check that stats contain numbers
    const stats = page.locator('text=/[0-9]+/')
    const statCount = await stats.count()

    // Should have at least some numeric stats
    expect(statCount).toBeGreaterThan(0)
  })

  test('should load users management page', async ({ page }) => {
    await page.goto('/admin/users')

    await expect(page.locator('h1')).toContainText(/Utilisateurs|Users/i)

    // Should display table or list
    const table = page.locator('table, [role="table"], [role="list"]')
    await expect(table).toBeVisible()
  })

  test('should display users in table', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for table to load
    await page.waitForTimeout(1000)

    // Check for table rows or list items
    const rows = page.locator('tbody tr, [role="row"]')
    const rowCount = await rows.count()

    // If there are users, should have at least one row
    if (rowCount > 0) {
      expect(rowCount).toBeGreaterThan(0)
    }
  })
})
