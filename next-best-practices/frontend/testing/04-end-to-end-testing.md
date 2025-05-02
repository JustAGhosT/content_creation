# End-to-End Testing in Next.js

## Table of Contents
- [Introduction](#introduction)
- [Setup](#setup)
- [Basic Navigation Tests](#basic-navigation-tests)
- [Form Submission Tests](#form-submission-tests)
- [Authentication Tests](#authentication-tests)
- [Best Practices](#best-practices)

## Introduction

End-to-end (E2E) testing verifies that your entire application works correctly from the user's perspective. These tests simulate real user interactions across multiple pages and components, ensuring that all parts of your application work together as expected.

## Setup

Use Cypress or Playwright for E2E testing:

```js
// Minimal Cypress setup
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
});

// OR Minimal Playwright setup
// playwright.config.js
module.exports = {
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
};
```

## Basic Navigation Tests

Test navigation between pages:

```js
// Minimal Cypress example
it('navigates between pages', () => {
  cy.visit('/');
  cy.get('nav').contains('About').click();
  cy.url().should('include', '/about');
  cy.contains('h1', 'About Us');
});

// Minimal Playwright example
test('navigates between pages', async ({ page }) => {
  await page.goto('/');
  await page.click('text=About');
  await expect(page).toHaveURL(/.*about/);
  await expect(page.locator('h1')).toContainText('About Us');
});
```

## Form Submission Tests

Test complete form submission flows:

```js
// Minimal Cypress example
it('submits contact form successfully', () => {
  cy.visit('/contact');
  cy.get('input[name="name"]').type('John Doe');
  cy.get('input[name="email"]').type('john@example.com');
  cy.get('textarea[name="message"]').type('Hello world');
  cy.get('button[type="submit"]').click();
  cy.contains('Message sent successfully');
});

// Minimal Playwright example
test('submits contact form successfully', async ({ page }) => {
  await page.goto('/contact');
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.fill('textarea[name="message"]', 'Hello world');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Message sent successfully')).toBeVisible();
});
```

## Authentication Tests

Test user authentication flows:

```js
// Minimal Cypress example
it('allows user to log in', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('user@example.com');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
  cy.contains('Welcome back');
});

// Minimal Playwright example
test('allows user to log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('text=Welcome back')).toBeVisible();
});
```

## Best Practices

1. **Test Critical User Flows**
   - Focus on the most important user journeys
   - Test complete workflows from start to finish
   - Prioritize tests that cover business-critical functionality

2. **Manage Test Data**
   - Set up and tear down test data appropriately
   - Use test database or API mocking when possible
   - Avoid dependencies between tests

3. **Handle Authentication**
   - Create helper functions for common authentication flows
   - Consider using API calls to set up authentication state
   - Test both authenticated and unauthenticated states

4. **Test for Accessibility**
   - Include basic accessibility checks in E2E tests
   - Verify keyboard navigation works correctly
   - Test with screen readers when possible

5. **Optimize Test Speed**
   - Group related tests to minimize setup/teardown
   - Use API shortcuts instead of UI interactions when possible
   - Run tests in parallel when supported

6. **Visual Testing**
   - Consider adding visual regression tests for critical UI components
   - Use screenshot comparison tools to detect unexpected changes
   - Focus on components that are prone to visual regressions