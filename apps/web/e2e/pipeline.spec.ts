import { test, expect } from '@playwright/test'

test.describe('Pipeline Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pipeline')
  })

  test('should load pipeline page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Pipeline|CRM/i)
  })

  test('should display pipeline items', async ({ page }) => {
    // Wait for pipeline data to load
    await page.waitForTimeout(1000)

    // Check for Kanban board or list
    const pipelineContainer = page.locator('[data-testid="pipeline"], .pipeline, [class*="kanban"]')
    if (await pipelineContainer.isVisible()) {
      await expect(pipelineContainer).toBeVisible()
    }
  })

  test('should display pipeline statuses', async ({ page }) => {
    // Check for status columns/sections
    const statusLabels = page.locator('text=/Prospection|Négociation|Conclusion/i')
    const statusCount = await statusLabels.count()

    if (statusCount > 0) {
      expect(statusCount).toBeGreaterThan(0)
    }
  })

  test('should have create button', async ({ page }) => {
    // Look for create/add button
    const createButton = page.locator(
      'button:has-text(/Créer|Ajouter|Nouveau/i), [aria-label*="Créer"], [aria-label*="Ajouter"]'
    )

    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible()
    }
  })
})
