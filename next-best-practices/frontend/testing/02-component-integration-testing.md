# Component Integration Testing in Next.js

## Table of Contents
- [Introduction](#introduction)
- [Setup](#setup)
- [Testing Component Interactions](#testing-component-interactions)
- [Testing Form Submissions](#testing-form-submissions)
- [Testing Navigation](#testing-navigation)
- [Best Practices](#best-practices)

## Introduction

Component integration testing verifies that multiple components work together correctly. Unlike unit tests that isolate components, integration tests examine how components interact with each other.

## Setup

Use React Testing Library with Jest:

```js
// Minimal setup in jest.config.js
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
});
```

## Testing Component Interactions

Test how components interact with each other:

```jsx
// Minimal example
it('shows user details when user is selected from list', async () => {
  render(<UserDirectory />);
  
  // Click on a user in the list
  await userEvent.click(screen.getByText('Jane Smith'));
  
  // Verify user details are displayed
  expect(screen.getByText('Email: jane@example.com')).toBeInTheDocument();
});
```

## Testing Form Submissions

Test form interactions across components:

```jsx
// Minimal example
it('submits form data and shows success message', async () => {
  render(<ContactForm />);
  
  // Fill form fields
  await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
  await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
  await userEvent.type(screen.getByLabelText('Message'), 'Hello world');
  
  // Submit form
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  // Check success message appears
  expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
});
```

## Testing Navigation

Test navigation between components:

```jsx
// Minimal example with mocked router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

it('navigates to product details when product is clicked', async () => {
  const mockRouter = { push: jest.fn() };
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  
  render(<ProductList products={mockProducts} />);
  
  await userEvent.click(screen.getByText('Product 1'));
  
  expect(mockRouter.push).toHaveBeenCalledWith('/products/1');
});
```

## Best Practices

1. **Focus on User Flows**
   - Test complete user interactions rather than isolated actions
   - Follow user journeys through the application

2. **Mock External Dependencies**
   - Mock API calls and external services
   - Use consistent mock data across tests

3. **Test Real DOM Events**
   - Use `userEvent` instead of `fireEvent` for more realistic interactions
   - Test keyboard navigation and accessibility

4. **Verify Component Communication**
   - Check that data flows correctly between components
   - Verify that state changes in one component affect others appropriately

5. **Keep Tests Independent**
   - Each test should set up its own environment
   - Avoid dependencies between tests

6. **Test Error Handling**
   - Verify that error states propagate correctly between components
   - Test recovery from error states