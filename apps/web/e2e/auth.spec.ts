import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Login|Connexion/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should load register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('input[name="name"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')

    // Try submitting empty form
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show email validation error
    await expect(page.locator('[role="alert"], .error')).toBeVisible()
  })
})
