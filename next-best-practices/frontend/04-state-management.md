# Next.js State Management Best Practices

## Table of Contents
- [Types of State](#types-of-state)
- [Local Component State](#local-component-state)
- [Context API](#context-api)
- [External State Libraries](#external-state-libraries)
- [Server State Management](#server-state-management)
- [State Persistence](#state-persistence)
- [Performance Optimization](#performance-optimization)

## Types of State

In Next.js applications, state can be categorized into several types:

| State Type | Description | Recommended Solution |
|------------|-------------|---------------------|
| UI State | Visual state (open/closed, active tab) | Local state (useState) |
| Form State | Input values, validation, submission | React Hook Form or Formik |
| App State | Shared data across components | Context API or Redux |
| Server State | Data from API endpoints | SWR or React Query |
| URL State | State derived from URL parameters | Next.js router |
| Persisted State | State that survives page refresh | localStorage + Context |

Choose the appropriate state management solution based on the complexity and scope of your state.

## Local Component State

For component-specific state, use React's built-in hooks:

```tsx
// Simple state
const [count, setCount] = useState(0);

// Object state
const [user, setUser] = useState<User | null>(null);

// Complex state with useReducer
const [state, dispatch] = useReducer(reducer, initialState);
```

**Best Practices:**
- Keep state as close as possible to where it's used
- Use functional updates for state derived from previous state
- Split complex state objects into smaller, focused pieces
- Use useReducer for state transitions with multiple sub-values

## Context API

For sharing state between components without prop drilling:

```tsx
// Minimal context example
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Value object should be memoized
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Best Practices:**
- Create separate contexts for unrelated state
- Use context selectors to prevent unnecessary re-renders
- Memoize context values with useMemo
- Create custom hooks for consuming context

## External State Libraries

For complex applications, consider these libraries:

### Redux Toolkit

```tsx
// Minimal slice example
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented: (state) => {
      state.value += 1;
    },
  },
});
```

### Zustand

```tsx
// Minimal store example
import create from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Jotai

```tsx
// Minimal atoms example
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleCountAtom = atom((get) => get(countAtom) * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [doubleCount] = useAtom(doubleCountAtom);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
    </div>
  );
}
```

**Best Practices:**
- Choose the simplest solution that meets your needs
- Organize state by feature or domain
- Use middleware for side effects and async operations
- Implement proper TypeScript typing for your state

## Server State Management

For managing server data and caching:

### SWR

```tsx
// Minimal SWR example
import useSWR from 'swr';

function Profile() {
  const { data, error, mutate } = useSWR('/api/user', fetcher);
  
  const updateUser = async (newData) => {
    await fetch('/api/user', { method: 'POST', body: JSON.stringify(newData) });
    mutate(); // Revalidate data
  };
  
  return (/* Component JSX */);
}
```

### React Query

```tsx
// Minimal React Query example
import { useQuery, useMutation, useQueryClient } from 'react-query';

function Profile() {
  const queryClient = useQueryClient();
  
  const { data } = useQuery('user', fetchUser);
  
  const mutation = useMutation(updateUser, {
    onSuccess: () => {
      queryClient.invalidateQueries('user');
    },
  });
  
  return (/* Component JSX */);
}
```

**Best Practices:**
- Implement proper loading and error states
- Use optimistic updates for better UX
- Configure appropriate stale times and caching
- Prefetch data when possible for faster rendering

## State Persistence

For persisting state across page refreshes:

```tsx
// Minimal localStorage persistence
function usePersistedState<T>(key: string, initialState: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : initialState;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  
  return [state, setState] as const;
}
```

**Best Practices:**
- Handle SSR by checking for window object
- Use libraries like next-iron-session for server-side persistence
- Consider using cookies for authentication state
- Implement proper error handling for storage operations

## Performance Optimization

Optimize state management performance:

```tsx
// Memoization example
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

// Callback memoization
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

**Best Practices:**
- Use selectors to access only needed parts of state
- Implement memoization for expensive calculations
- Avoid state updates in render paths
- Use React DevTools Profiler to identify unnecessary re-renders
- Split large state providers to minimize re-renders