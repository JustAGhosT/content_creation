# Next.js Routing and Navigation Best Practices

## Table of Contents
- [File-Based Routing](#file-based-routing)
- [Dynamic Routes](#dynamic-routes)
- [Nested Routes](#nested-routes)
- [Navigation](#navigation)
- [Route Parameters](#route-parameters)
- [Route Guards](#route-guards)
- [Layouts](#layouts)
- [404 and Error Pages](#404-and-error-pages)
- [Shallow Routing](#shallow-routing)
- [Internationalization](#internationalization)

## File-Based Routing

Next.js uses a file-system based router where files in the `pages` directory automatically become routes.

**Directory Structure:**
```
pages/
├── index.tsx         # Route: /
├── about.tsx         # Route: /about
├── blog/
│   ├── index.tsx     # Route: /blog
│   └── [slug].tsx    # Route: /blog/:slug
└── _app.tsx          # Custom App component
```

**Best Practices:**
- Keep page components focused on layout and data fetching
- Move business logic to separate files/hooks
- Use descriptive filenames that match the route purpose
- Group related routes in subdirectories

## Dynamic Routes

Create dynamic routes with bracket notation:

```tsx
// pages/posts/[id].tsx
import { useRouter } from 'next/router';

export default function Post() {
  const router = useRouter();
  const { id } = router.query; // Access the dynamic route parameter
  
  return <p>Post ID: {id}</p>;
}
```

**Best Practices:**
- Validate route parameters before using them
- Implement loading states while data is being fetched
- Handle invalid parameters gracefully
- Use TypeScript to type your route parameters

## Nested Routes

For complex applications, use nested dynamic routes:

```
pages/
└── products/
    ├── index.tsx           # /products
    ├── [category]/
    │   ├── index.tsx       # /products/[category]
    │   └── [product].tsx   # /products/[category]/[product]
```

**Best Practices:**
- Keep nesting to a reasonable depth (2-3 levels)
- Consider UX when designing nested routes
- Use breadcrumbs for deep navigation hierarchies
- Implement proper loading states for nested data dependencies

## Navigation

Use Next.js Link component for client-side navigation:

```tsx
import Link from 'next/link';

// Basic navigation
<Link href="/about">About</Link>

// With route parameters
<Link href={`/posts/${post.id}`}>Read Post</Link>

// With query parameters
<Link 
  href={{
    pathname: '/blog',
    query: { category: 'tech' },
  }}
>
  Tech Posts
</Link>
```

For programmatic navigation:

```tsx
import { useRouter } from 'next/router';

const router = useRouter();

// Basic navigation
router.push('/dashboard');

// With route parameters
router.push(`/products/${productId}`);

// With query parameters
router.push({
  pathname: '/search',
  query: { keyword: 'nextjs' },
});
```

**Best Practices:**
- Always use `Link` for internal navigation
- Add `prefetch={false}` for less important links
- Use the `replace` prop to replace history instead of pushing
- Implement proper loading indicators for navigation

## Route Parameters

Access and validate route parameters:

```tsx
// Type-safe route parameters
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';

interface PostParams extends ParsedUrlQuery {
  id: string;
}

export default function Post() {
  const router = useRouter();
  const { id } = router.query as PostParams;
  
  // Validate the parameter
  const isValidId = id && /^\d+$/.test(id);
  
  if (!isValidId) {
    return <div>Invalid post ID</div>;
  }
  
  return <div>Post ID: {id}</div>;
}
```

**Best Practices:**
- Type your route parameters with TypeScript
- Validate parameters before using them
- Handle loading states while parameters are undefined
- Consider encoding/decoding special characters in parameters

## Route Guards

Implement route guards for protected pages:

```tsx
// Simple auth guard with useEffect
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.replace({
        pathname: '/login',
        query: { returnUrl: router.asPath },
      });
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return <div>Loading...</div>;
  }
  
  return <div>Protected content</div>;
}
```

**Best Practices:**
- Create a reusable HOC or hook for auth protection
- Redirect to login with return URL for better UX
- Handle loading states appropriately
- Implement role-based access control when needed

## Layouts

Create consistent layouts across pages:

```tsx
// components/layouts/MainLayout.tsx
export default function MainLayout({ children }) {
  return (
    <div className="layout">
      <header>...</header>
      <main>{children}</main>
      <footer>...</footer>
    </div>
  );
}

// pages/about.tsx
import MainLayout from '@/components/layouts/MainLayout';

export default function About() {
  return (
    <MainLayout>
      <h1>About Us</h1>
      <p>Content goes here...</p>
    </MainLayout>
  );
}
```

**Best Practices:**
- Create reusable layout components
- Use composition for nested layouts
- Consider using the new Next.js App Router for more advanced layouts
- Keep layouts focused on structure, not data fetching

## 404 and Error Pages

Customize error pages:

```tsx
// pages/404.tsx
export default function Custom404() {
  return <h1>404 - Page Not Found</h1>;
}

// pages/500.tsx
export default function Custom500() {
  return <h1>500 - Server Error</h1>;
}

// pages/_error.tsx
function Error({ statusCode }) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on server`
        : 'An error occurred on client'}
    </p>
  );
}
```

**Best Practices:**
- Create custom 404 and 500 pages
- Add helpful navigation options on error pages
- Implement error tracking/logging
- Consider the user journey after encountering an error

## Shallow Routing

Update the URL without running data fetching methods:

```tsx
// Update URL without running getServerSideProps/getStaticProps
router.push('/dashboard?tab=settings', undefined, { shallow: true });

// Listen for route changes with shallow routing
useEffect(() => {
  const handleRouteChange = (url, { shallow }) => {
    if (shallow) {
      // Handle shallow route change
      const query = router.query;
      // Update UI based on new query parameters
    }
  };

  router.events.on('routeChangeComplete', handleRouteChange);
  return () => {
    router.events.off('routeChangeComplete', handleRouteChange);
  };
}, [router]);
```

**Best Practices:**
- Use shallow routing for tab interfaces or filters
- Listen to route changes to update UI accordingly
- Keep state in sync with URL parameters
- Consider UX implications of changing the URL without page refresh

## Internationalization

Implement i18n routing:

```tsx
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'fr', 'de'],
    defaultLocale: 'en',
  },
}

// Access locale in component
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();
  const { locale, locales, defaultLocale } = router;
  
  return (
    <div>
      <p>Current locale: {locale}</p>
      <p>Default locale: {defaultLocale}</p>
      <div>
        {locales.map((l) => (
          <button
            key={l}
            onClick={() => router.push(router.pathname, router.asPath, { locale: l })}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Best Practices:**
- Configure i18n in next.config.js
- Use locale-specific content files
- Implement language switcher
- Consider SEO implications with proper meta tags
- Use libraries like next-i18next for translation management