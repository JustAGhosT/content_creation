# Unit Testing in Next.js

## Table of Contents
- [Testing Framework Setup](#testing-framework-setup)
- [Component Testing](#component-testing)
- [Hook Testing](#hook-testing)
- [Utility Function Testing](#utility-function-testing)
- [Mocking Dependencies](#mocking-dependencies)
- [Best Practices](#best-practices)

## Testing Framework Setup

### Jest and React Testing Library

The most common setup for testing Next.js applications:

```bash
# Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Optional: TypeScript support
npm install --save-dev ts-jest @types/jest
```

### Configuration

Create a `jest.config.js` file:

```js
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app
  dir: './',
});

// Custom Jest config
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create a `jest.setup.js` file:

```js
// jest.setup.js
import '@testing-library/jest-dom';
```

Update `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Component Testing

### Basic Component Test

```tsx
// components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button component', () => {
  it('renders correctly', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    
    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Testing with Props

```tsx
// components/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
};

describe('UserProfile component', () => {
  it('displays user information correctly', () => {
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.role)).toBeInTheDocument();
  });

  it('shows loading state when user is null', () => {
    render(<UserProfile user={null} isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    render(<UserProfile user={null} error="Failed to load user" />);
    expect(screen.getByText('Failed to load user')).toBeInTheDocument();
  });
});
```

## Hook Testing

### Testing Custom Hooks

```tsx
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import useCounter from './useCounter';

describe('useCounter hook', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('should initialize with provided value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('should decrement counter', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });

  it('should reset counter to initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
      result.current.reset();
    });
    
    expect(result.current.count).toBe(5);
  });
});
```

### Testing Hooks with Context

```tsx
// hooks/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import useAuth from './useAuth';

const wrapper = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth hook', () => {
  it('should return user as null initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('should update user after login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).not.toBeNull();
    expect(result.current.user.email).toBe('test@example.com');
  });

  it('should clear user after logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
      await result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
  });
});
```

## Utility Function Testing

### Pure Function Testing

```tsx
// utils/formatters.test.ts
import { formatCurrency, formatDate, truncateText } from './formatters';

describe('formatCurrency', () => {
  it('formats numbers to USD currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1000.5)).toBe('$1,000.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats dates correctly', () => {
    const date = new Date('2023-01-15T12:00:00Z');
    expect(formatDate(date)).toBe('Jan 15, 2023');
  });
  
  it('handles invalid dates', () => {
    expect(formatDate(null)).toBe('Invalid date');
    expect(formatDate(undefined)).toBe('Invalid date');
  });
});

describe('truncateText', () => {
  it('truncates text to specified length', () => {
    expect(truncateText('Hello world', 5)).toBe('Hello...');
    expect(truncateText('Hello', 10)).toBe('Hello');
  });
  
  it('handles empty strings', () => {
    expect(truncateText('', 5)).toBe('');
  });
});
```

### Async Function Testing

```tsx
// utils/api.test.ts
import { fetchUser, createUser, updateUser } from './api';

// Mock fetch
global.fetch = jest.fn();

describe('API utility functions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('fetchUser', () => {
    it('fetches user successfully', async () => {
      const mockUser = { id: '1', name: 'John Doe' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });
      
      const user = await fetchUser('1');
      expect(user).toEqual(mockUser);
      expect(fetch).toHaveBeenCalledWith('/api/users/1');
    });
    
    it('throws error when fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      
      await expect(fetchUser('999')).rejects.toThrow('Not Found');
    });
  });
  
  // Additional tests for createUser and updateUser...
});
```

## Mocking Dependencies

### Mocking Next.js Router

```tsx
// components/Navigation.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import Navigation from './Navigation';

// Mock the Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('Navigation component', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/',
      query: {},
    });
  });
  
  it('navigates to the dashboard when dashboard link is clicked', async () => {
    render(<Navigation />);
    
    await userEvent.click(screen.getByText('Dashboard'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
  
  it('highlights the active link based on current path', () => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/profile',
      query: {},
    });
    
    render(<Navigation />);
    
    expect(screen.getByText('Profile')).toHaveClass('active');
    expect(screen.getByText('Dashboard')).not.toHaveClass('active');
  });
});
```

### Mocking API Calls

```tsx
// components/UserList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import UserList from './UserList';

// Mock the API module
jest.mock('../utils/api', () => ({
  fetchUsers: jest.fn(),
}));

import { fetchUsers } from '../utils/api';

describe('UserList component', () => {
  it('displays users when loaded successfully', async () => {
    const mockUsers = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ];
    
    (fetchUsers as jest.Mock).mockResolvedValueOnce(mockUsers);
    
    render(<UserList />);
    
    // Should show loading initially
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
    
    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });
  
  it('displays error message when fetch fails', async () => {
    (fetchUsers as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    
    render(<UserList />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the component does, not how it's implemented
   - Write tests from the user's perspective
   - Avoid testing implementation details

2. **Use Data-Test Attributes**
   - Add `data-testid` attributes for test-specific element selection
   - Avoid selecting elements by class or tag names

   ```tsx
   <button data-testid="submit-button">Submit</button>
   
   // In test
   screen.getByTestId('submit-button')
   ```

3. **Organize Tests Properly**
   - Group related tests with `describe` blocks
   - Use clear test descriptions with `it` or `test`
   - Follow the Arrange-Act-Assert pattern

4. **Mock External Dependencies**
   - Mock API calls, routers, and third-party libraries
   - Use Jest's mock functions for callbacks and event handlers
   - Reset mocks between tests

5. **Test Edge Cases**
   - Test loading states
   - Test error states
   - Test empty states
   - Test boundary conditions

6. **Keep Tests Fast and Independent**
   - Each test should be able to run independently
   - Avoid test interdependence
   - Mock expensive operations

7. **Maintain Test Coverage**
   - Aim for high test coverage (70-80% or higher)
   - Focus on critical business logic
   - Run coverage reports regularly