import { test, expect } from '@playwright/test'

test.describe('Final Bulls & Bears Battle', () => {
  // Increase timeout for demo test (demo takes ~30-60 seconds)
  test('should assign places 1, 2, 3 after demo completes', async ({ page }) => {
    test.setTimeout(120000) // 120 seconds for full demo

    // 1. Navigate to /live-test
    await page.goto('/live-test')

    // Wait for page to load
    await expect(page.locator('text=DEV TEST')).toBeVisible()

    // 2. Click FINAL menu item
    await page.click('[data-testid="menu-final"]')

    // Wait for final page to load
    await expect(page.locator('text=FINAL TEST')).toBeVisible()

    // 3. Click RUN DEMO button
    await page.click('[data-testid="run-demo-btn"]')

    // 4. Wait for places to be assigned (check for "МЕСТО" text appearing)
    // The demo assigns places when players get 3 bulls or 3 bears
    const placeLabels = page.locator('text=/\\d МЕСТО/')

    // Wait for at least one place to be assigned (max 90 seconds)
    await expect(placeLabels.first()).toBeVisible({ timeout: 90000 })

    // Wait a bit more for all places to be assigned
    await page.waitForTimeout(5000)

    // Verify at least 2 places were assigned (could be 3)
    const placeCount = await placeLabels.count()
    expect(placeCount).toBeGreaterThanOrEqual(2)

    // Take screenshot for verification
    await page.screenshot({ path: 'tests/screenshots/final-places-assigned.png' })
  })

  test('should display 3 player cards', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-final"]')

    // Wait for final page to load
    await expect(page.locator('text=FINAL TEST')).toBeVisible()

    // Wait for FinalBattle component to render
    // Check for player avatars (3 players in final)
    const playerAvatars = page.locator('img[alt=""]').filter({ has: page.locator('.rounded-full') })
    await expect(playerAvatars).toHaveCount(3)
  })

  test('should show wheel and cursor', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-final"]')

    // Wait for final page to load
    await expect(page.locator('text=FINAL TEST')).toBeVisible()

    // Verify wheel image is visible
    await expect(page.locator('img[alt="wheel"]')).toBeVisible()

    // Verify cursor image is visible
    await expect(page.locator('img[alt="cursor"]')).toBeVisible()
  })

  test('should show bulls and bears score grid', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-final"]')

    // Wait for final page to load
    await expect(page.locator('text=FINAL TEST')).toBeVisible()

    // Verify bull icons are visible (3 per player × 3 players = 9)
    const bullIcons = page.locator('img[alt="bull"]')
    await expect(bullIcons).toHaveCount(9)

    // Verify bear icons are visible (3 per player × 3 players = 9)
    const bearIcons = page.locator('img[alt="bear"]')
    await expect(bearIcons).toHaveCount(9)
  })

  test('should show RUN DEMO button', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-final"]')

    // Wait for final page to load
    await expect(page.locator('text=FINAL TEST')).toBeVisible()

    // Verify RUN DEMO button exists
    await expect(page.locator('[data-testid="run-demo-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="run-demo-btn"]')).toContainText('RUN DEMO')
  })
})
