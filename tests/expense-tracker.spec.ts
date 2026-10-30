import { test, expect } from '@playwright/test';

/**
 * @file tests/expense-tracker.spec.ts
 * @description Comprehensive Playwright test suite for Smart Expense Tracker.
 * Covers Smoke, Boundary, Negative, and Regression testing.
 */

const BASE_URL = 'http://127.0.0.1:5500'; // Adjust if your local server port differs

test.describe('Smart Expense Tracker - Automated Test Suite', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    /**
     * HELPER: Adds an expense using the form
     */
    async function addExpense(page, { date, name, amount, category }) {
        await page.fill('#expense-date', date);
        await page.fill('#expense-name', name);
        await page.fill('#expense-amount', amount);
        await page.selectOption('#expense-category', category);
        await page.click('button[type="submit"]');
    }

    test.describe('Smoke Tests (Happy Path)', () => {
        test('should add a valid expense and update the total amount', async ({ page }) => {
            const today = new Date().toISOString().split('T')[0];
            
            await addExpense(page, {
                date: today,
                name: 'Grocery Shopping',
                amount: '50.00',
                category: 'Food'
            });

            // Verify expense appears in the table
            await expect(page.locator('#expense-list tr')).toHaveCount(1);
            await expect(page.locator('#expense-list')).toContainText('Grocery Shopping');
            await expect(page.locator('#expense-list')).toContainText('$50.00');

            // Verify total updates
            await expect(page.locator('#total-amount')).toHaveText('$50.00');
        });

        test('should delete an individual expense via the delete button', async ({ page }) => {
            const today = new Date().toISOString().split('T')[0];
            await addExpense(page, { date: today, name: 'Coffee', amount: '5.00', category: 'Food' });

            // Click individual delete
            await page.click('.btn-delete');
            
            // Confirm in custom modal
            await page.click('#modal-confirm-btn');

            // Verify it's gone
            await expect(page.locator('#expense-list tr')).toHaveCount(0);
            await expect(page.locator('#empty-state')).toBeVisible();
            await expect(page.locator('#total-amount')).toHaveText('$0.00');
        });
    });

    test.describe('Negative Tests (Error Handling)', () => {
        test('should show specific error for future dates', async ({ page }) => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            await page.fill('#expense-date', tomorrowStr);
            
            // Requirement: Error should show immediately on change
            const errorEl = page.locator('#expense-date + .error-text');
            await expect(errorEl).toBeVisible();
            await expect(errorEl).toHaveText('Future dates are not supported.');
        });

        test('should show general error message when submitting empty form', async ({ page }) => {
            // Submit empty form
            await page.click('button[type="submit"]');

            // Check for the general error message under the button
            const generalError = page.locator('#form-error-message');
            await expect(generalError).toBeVisible();
            await expect(generalError).toHaveText('Please fix invalid values');
        });

        test('should show general error message when submitting with invalid amount', async ({ page }) => {
            const today = new Date().toISOString().split('T')[0];
            await page.fill('#expense-date', today);
            await page.fill('#expense-name', 'Test');
            await page.fill('#expense-amount', 'abc'); // Invalid
            await page.selectOption('#expense-category', 'Other');
            await page.click('button[type="submit"]');

            // Check field-specific error
            const fieldError = page.locator('#expense-amount + .error-text');
            await expect(fieldError).toBeVisible();
            await expect(fieldError).toHaveText('Please enter a valid value');

            // Check general error message
            const generalError = page.locator('#form-error-message');
            await expect(generalError).toBeVisible();
            await expect(generalError).toHaveText('Please fix invalid values');
        });

        test('should show general error message when submitting with invalid category', async ({ page }) => {
            const today = new Date().toISOString().split('T')[0];
            await page.fill('#expense-date', today);
            await page.fill('#expense-name', 'Test');
            await page.fill('#expense-amount', '10.00');
            // Leave category unselected
            await page.click('button[type="submit"]');

            // Check field-specific error
            const fieldError = page.locator('#expense-category + .error-text');
            await expect(fieldError).toBeVisible();
            await expect(fieldError).toHaveText('Please enter a valid value');

            // Check general error message
            const generalError = page.locator('#form-error-message');
            await expect(generalError).toBeVisible();
            await expect(generalError).toHaveText('Please fix invalid values');
        });

        test('should hide general error message when user starts typing', async ({ page }) => {
            // 1. Trigger general error
            await page.click('button[type="submit"]');
            const generalError = page.locator('#form-error-message');
            await expect(generalError).toBeVisible();

            // 2. Type in a field
            await page.fill('#expense-name', 'A');

            // 3. Verify general error is hidden
            await expect(generalError).not.toBeVisible();
        });

        test('should show error for empty required fields', async ({ page }) => {
            await page.click('button[type="submit"]');

            // Check multiple error messages
            await expect(page.locator('#expense-name + .error-text')).toBeVisible();
            await expect(page.locator('#expense-amount + .error-text')).toBeVisible();
            await expect(page.locator('#expense-category + .error-text')).toBeVisible();
        });
    });

    test.describe('Boundary Tests (Monetary Input)', () => {
        const today = new Date().toISOString().split('T')[0];

        test('should accept amount with 0 decimal places', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Lunch', amount: '15', category: 'Food' });
            await expect(page.locator('#expense-list')).toContainText('$15.00');
        });

        test('should accept amount with 1 decimal place', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Lunch', amount: '15.5', category: 'Food' });
            await expect(page.locator('#expense-list')).toContainText('$15.50');
        });

        test('should accept amount with exactly 2 decimal places', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Lunch', amount: '15.55', category: 'Food' });
            await expect(page.locator('#expense-list')).toContainText('$15.55');
        });
    });

    test.describe('Regression & UI Functional Tests', () => {
        const today = new Date().toISOString().split('T')[0];

        test('should handle "Select All" checkbox states (checked, indeterminate, unchecked)', async ({ page }) => {
            // 1. Add multiple items
            await addExpense(page, { date: today, name: 'Item 1', amount: '10', category: 'Other' });
            await addExpense(page, { date: today, name: 'Item 2', amount: '20', category: 'Other' });
            await addExpense(page, { date: today, name: 'Item 3', amount: '30', category: 'Other' });

            const selectAll = page.locator('#select-all');

            // 2. Test Indeterminate state (select only one)
            await page.locator('.row-checkbox').first().check();
            const isIndeterminate = await selectAll.evaluate((el: HTMLInputElement) => el.indeterminate);
            expect(isIndeterminate).toBe(true);

            // 3. Test Checked state (select all)
            await selectAll.check();
            const isAllChecked = await selectAll.evaluate((el: HTMLInputElement) => el.checked);
            expect(isAllChecked).toBe(true);

            // 4. Test Unchecked state
            await selectAll.uncheck();
            await expect(selectAll).not.toBeChecked();
        });

        test('should show/hide bulk actions based on selection', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Item 1', amount: '10', category: 'Other' });
            
            const bulkActions = page.locator('#bulk-actions');
            
            // Should be hidden initially
            await expect(bulkActions).toBeHidden();

            // Should show after selection
            await page.locator('.row-checkbox').first().check();
            await expect(bulkActions).toBeVisible();
        });

        test('should perform bulk deletion via custom modal', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Item 1', amount: '10', category: 'Other' });
            await addExpense(page, { date: today, name: 'Item 2', amount: '20', category: 'Other' });

            // Select all
            await page.locator('#select-all').check();
            
            // Click Bulk Delete
            await page.click('#bulk-delete-btn');
            
            // Verify Modal Message
            await expect(page.locator('#modal-message')).toContainText('delete 2 selected item(s)');
            
            // Confirm
            await page.click('#modal-confirm-btn');

            // Verify everything is gone
            await expect(page.locator('#expense-list tr')).toHaveCount(0);
        });

        test('should allow cancelling deletion in modal', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Important Item', amount: '100', category: 'Other' });

            await page.click('.btn-delete');
            await page.click('#modal-cancel-btn');

            // Item should still exist
            await expect(page.locator('#expense-list tr')).toHaveCount(1);
            await expect(page.locator('#expense-list')).toContainText('Important Item');
        });

        test('should sort expenses by different columns', async ({ page }) => {
            await addExpense(page, { date: today, name: 'Zebra', amount: '10', category: 'Other' });
            await addExpense(page, { date: today, name: 'Apple', amount: '50', category: 'Other' });
            await addExpense(page, { date: today, name: 'Mango', amount: '25', category: 'Other' });

            // Sort by Name (Ascending)
            const nameHeader = page.locator('th[data-column="name"]');
            await nameHeader.click(); // First click: asc
            
            const rows = page.locator('#expense-list tr');
            await expect(rows.nth(0)).toContainText('Apple');
            await expect(rows.nth(1)).toContainText('Mango');
            await expect(rows.nth(2)).toContainText('Zebra');

            // Sort by Amount (Descending)
            const amountHeader = page.locator('th[data-column="amount"]');
            await amountHeader.click(); // Asc
            await amountHeader.click(); // Desc

            await expect(rows.nth(0)).toContainText('$50.00');
            await expect(rows.nth(1)).toContainText('$25.00');
            await expect(rows.nth(2)).toContainText('$10.00');
        });
    });
});
