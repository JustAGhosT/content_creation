# Next.js Component Architecture Best Practices

## Table of Contents
- [Component Organization](#component-organization)
- [Component Types](#component-types)
- [Props and TypeScript](#props-and-typescript)
- [State Management](#state-management)
- [Component Composition](#component-composition)

## Component Organization

### Directory Structure
```
/components
  /common            # Shared components used across multiple features
    /Button
      Button.tsx
      Button.module.css
      Button.test.tsx
      index.ts       # Re-export for cleaner imports
  /layout            # Layout components like Header, Footer, Sidebar
  /features          # Feature-specific components
    /Dashboard
    /UserProfile
  /hooks             # Custom hooks
  /utils             # Utility functions
```

### Best Practices

1. **Atomic Design Methodology**
   - Organize components as atoms, molecules, organisms, templates, and pages
   - Atoms: Basic building blocks (buttons, inputs)
   - Molecules: Simple component groups (form fields with labels)
   - Organisms: Complex UI sections (navigation bars)
   - Templates: Page layouts without content
   - Pages: Templates with actual content

2. **Component Isolation**
   - Each component should have its own directory
   - Include all related files (styles, tests, utils)
   - Export via index.ts for clean imports

3. **Consistent Naming Conventions**
   - Use PascalCase for component files and directories
   - Use descriptive names that reflect component purpose
   - Suffix test files with `.test` or `.spec`

## Component Types

### Functional Components

Always use functional components with hooks instead of class components:

```tsx
// Good
const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};

// Avoid class components
class UserProfile extends React.Component<UserProfileProps> {
  render() {
    return (
      <div>
        <h1>{this.props.user.name}</h1>
        <p>{this.props.user.email}</p>
      </div>
    );
  }
}
```

### Page Components

For Next.js pages, follow these patterns:

```tsx
// pages/users/[id].tsx
import type { GetServerSideProps, NextPage } from 'next';
import { UserProfile } from '@/components/features/UserProfile';
import { fetchUser } from '@/lib/api';

interface UserPageProps {
  user: User;
}

const UserPage: NextPage<UserPageProps> = ({ user }) => {
  return <UserProfile user={user} />;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const user = await fetchUser(id);
  
  if (!user) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      user,
    },
  };
};

export default UserPage;
```

## Props and TypeScript

### Define Prop Types

Always define prop types for components:

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```

### Default Props

Use destructuring with default values instead of the defaultProps static property:

```tsx
// Good
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  label,
  onClick,
}) => {
  // ...
};

// Avoid
const Button: React.FC<ButtonProps> = (props) => {
  // ...
};

Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
  disabled: false,
};
```

## State Management

### Local State

For component-specific state, use useState and useReducer:

```tsx
const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};
```

### Complex State

For more complex state, use useReducer:

```tsx
type State = {
  count: number;
  isLoading: boolean;
  error: string | null;
};

type Action = 
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const ComplexCounter: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, {
    count: 0,
    isLoading: false,
    error: null,
  });
  
  // Component logic
};
```

### Global State

For application-wide state, consider these options:

1. **React Context**: For simpler applications
2. **Redux Toolkit**: For complex state with many components
3. **Zustand**: For a simpler alternative to Redux
4. **Jotai/Recoil**: For atomic state management

## Component Composition

### Composition over Props

Use composition instead of passing too many props:

```tsx
// Good
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card">
    <h2>{title}</h2>
    <div className="card-content">
      {children}
    </div>
  </div>
);

const UserCard: React.FC<{ user: User }> = ({ user }) => (
  <Card title={user.name}>
    <p>Email: {user.email}</p>
    <p>Role: {user.role}</p>
  </Card>
);

// Avoid
const Card: React.FC<{ 
  title: string;
  email?: string;
  role?: string;
  // many more props
}> = ({ title, email, role }) => (
  <div className="card">
    <h2>{title}</h2>
    <div className="card-content">
      {email && <p>Email: {email}</p>}
      {role && <p>Role: {role}</p>}
    </div>
  </div>
);
```

### Render Props

Use render props for flexible component behavior:

```tsx
interface DataFetcherProps<T> {
  fetchFunction: () => Promise<T>;
  render: (data: T, isLoading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher<T>({ fetchFunction, render }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchFunction();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [fetchFunction]);

  return <>{render(data as T, isLoading, error)}</>;
}

// Usage
<DataFetcher
  fetchFunction={() => fetch('/api/users').then(res => res.json())}
  render={(data, isLoading, error) => {
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;
    return <UserList users={data} />;
  }}
/>
```