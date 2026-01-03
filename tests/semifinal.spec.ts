import { test, expect } from '@playwright/test'

test.describe('Semifinal Traffic Light Roulette', () => {
  // Increase timeout for demo test (demo takes ~40 seconds)
  test('should show OUT badge after 3 hits', async ({ page }) => {
    test.setTimeout(90000) // 90 seconds for full demo

    // 1. Navigate to /live-test
    await page.goto('/live-test')

    // Wait for page to load
    await expect(page.locator('text=DEV TEST')).toBeVisible()

    // 2. Click SEMIFINAL menu item
    await page.click('[data-testid="menu-semifinal"]')

    // Wait for semifinal page to load
    await expect(page.locator('text=SEMIFINAL TEST')).toBeVisible()

    // 3. Click RUN DEMO button
    await page.click('[data-testid="run-demo-btn"]')

    // 4. Wait for OUT badge to appear (max 70 seconds for demo to run)
    // The demo takes ~40 seconds to complete with 2 eliminations
    const outBadge = page.locator('[data-testid="out-badge"]')
    await expect(outBadge.first()).toBeVisible({ timeout: 70000 })

    // Verify the badge contains "OUT" text
    await expect(outBadge.first()).toContainText('OUT')

    // Take screenshot for verification
    await page.screenshot({ path: 'tests/screenshots/semifinal-out-badge.png' })
  })

  test('should display 5 player cards', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-semifinal"]')

    // Wait for semifinal to load
    await expect(page.locator('text=SEMIFINAL TEST')).toBeVisible()

    // Wait for player cards to render (5 players in semifinal)
    // Use more specific selector - cards with ticket numbers
    const playerCards = page.locator('.w-\\[68px\\]')
    await expect(playerCards).toHaveCount(5)
  })

  test('should show roulette strip', async ({ page }) => {
    await page.goto('/live-test')
    await page.click('[data-testid="menu-semifinal"]')

    // Wait for semifinal to load
    await expect(page.locator('text=SEMIFINAL TEST')).toBeVisible()

    // Verify cursor image is visible
    await expect(page.locator('img[alt="cursor"]')).toBeVisible()

    // Verify roulette strip (the one with py-2 class specifically for roulette)
    const rouletteStrip = page.locator('.py-2.overflow-hidden.rounded-xl')
    await expect(rouletteStrip).toBeVisible()
  })
})
