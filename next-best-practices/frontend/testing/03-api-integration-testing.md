# API Integration Testing in Next.js

## Table of Contents
- [Introduction](#introduction)
- [Setup](#setup)
- [Testing API Routes](#testing-api-routes)
- [Testing External API Interactions](#testing-external-api-interactions)
- [Testing API Error Handling](#testing-api-error-handling)
- [Best Practices](#best-practices)

## Introduction

API integration testing verifies that your Next.js API routes work correctly and that your frontend properly interacts with external APIs. These tests ensure data flows correctly between your application and various data sources.

## Setup

Use Jest with `node-mocks-http` for API route testing:

```js
// Minimal setup
npm install --save-dev node-mocks-http

// jest.config.js
module.exports = {
  testEnvironment: 'node', // Use node environment for API tests
};
```

## Testing API Routes

Test Next.js API routes:

```jsx
// Minimal example for testing an API route
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/users/[id]';

it('returns user data for valid ID', async () => {
  const { req, res } = createMocks({
    method: 'GET',
    query: { id: '1' },
  });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  expect(JSON.parse(res._getData())).toEqual({
    id: '1',
    name: 'John Doe',
  });
});
```

## Testing External API Interactions

Test components that fetch from external APIs:

```jsx
// Minimal example with mocked fetch
global.fetch = jest.fn();

it('loads and displays user data', async () => {
  // Mock the API response
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ name: 'John Doe', email: 'john@example.com' }),
  });

  render(<UserProfile userId="1" />);
  
  // Check loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  // Verify API was called with correct parameters
  expect(fetch).toHaveBeenCalledWith('/api/users/1');
});
```

## Testing API Error Handling

Test how your application handles API errors:

```jsx
// Minimal example
it('displays error message when API fails', async () => {
  // Mock the API error
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 500,
    statusText: 'Server Error',
  });

  render(<UserProfile userId="1" />);
  
  // Wait for error state
  await waitFor(() => {
    expect(screen.getByText('Failed to load user data')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Isolate External Dependencies**
   - Mock external API calls
   - Use consistent mock responses
   - Test both success and error scenarios

2. **Test API Route Handlers Directly**
   - Use `node-mocks-http` to simulate requests
   - Test different HTTP methods (GET, POST, etc.)
   - Verify status codes and response bodies

3. **Validate Request Parameters**
   - Test that API routes handle query parameters correctly
   - Verify that body data is processed properly
   - Test validation and error handling

4. **Test Authentication and Authorization**
   - Verify protected routes reject unauthorized requests
   - Test that authorized requests succeed
   - Check that user-specific data is properly secured

5. **Test Rate Limiting and Edge Cases**
   - Verify rate limiting works as expected
   - Test handling of malformed requests
   - Check behavior with unexpected input

6. **Use Realistic Data**
   - Create mock data that resembles real API responses
   - Test with various data shapes and sizes
   - Include edge cases like empty arrays or null values