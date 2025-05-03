# Next.js Data Fetching Best Practices

## Table of Contents
- [Data Fetching Methods](#data-fetching-methods)
- [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
- [Static Site Generation (SSG)](#static-site-generation-ssg)
- [Incremental Static Regeneration (ISR)](#incremental-static-regeneration-isr)
- [Client-Side Fetching](#client-side-fetching)
- [API Routes](#api-routes)
- [Error Handling](#error-handling)
- [TypeScript Integration](#typescript-integration)

## Data Fetching Methods

Next.js provides several methods for fetching data:

| Method | Function | When to Use |
|--------|----------|------------|
| Server-Side Rendering | `getServerSideProps` | Dynamic data that changes on every request |
| Static Site Generation | `getStaticProps` | Data that can be fetched at build time |
| Static Paths | `getStaticPaths` | Define dynamic routes for SSG |
| Incremental Static Regeneration | `revalidate` in `getStaticProps` | Periodically update static pages |
| Client-Side Fetching | `SWR` or `React Query` | Data that changes frequently or is user-specific |

## Server-Side Rendering (SSR)

Use `getServerSideProps` when you need to fetch data on each request:

```tsx
// Minimal example
export async function getServerSideProps(context) {
  const res = await fetch(`https://api.example.com/data`);
  const data = await res.json();

  return { props: { data } };
}
```

**Best Practices:**
- Use for personalized or frequently changing data
- Implement caching headers when possible
- Keep fetch operations parallel when multiple requests are needed
- Handle errors gracefully with fallbacks

## Static Site Generation (SSG)

Use `getStaticProps` for data that can be fetched at build time:

```tsx
// Minimal example
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  return {
    props: { posts },
  };
}
```

For dynamic routes, use `getStaticPaths`:

```tsx
// Minimal example
export async function getStaticPaths() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();
  
  const paths = posts.map((post) => ({
    params: { id: post.id.toString() },
  }));

  return { paths, fallback: 'blocking' };
}
```

**Best Practices:**
- Use for marketing pages, blog posts, product listings
- Choose appropriate `fallback` strategy:
  - `false`: 404 for undefined paths
  - `true`: Show loading state, then render
  - `'blocking'`: SSR-like behavior for undefined paths
- Generate the most important pages at build time

## Incremental Static Regeneration (ISR)

Add a `revalidate` property to `getStaticProps` to update static pages:

```tsx
// Minimal example
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();

  return {
    props: { data },
    revalidate: 60, // Regenerate after 60 seconds
  };
}
```

**Best Practices:**
- Set reasonable revalidation periods based on data freshness needs
- Use on-demand revalidation for immediate updates when available
- Implement stale-while-revalidate pattern for optimal UX

## Client-Side Fetching

Use SWR or React Query for client-side data fetching:

```tsx
// Minimal SWR example
import useSWR from 'swr';

function Profile() {
  const { data, error } = useSWR('/api/user', fetcher);
  
  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;
  
  return <div>Hello {data.name}!</div>;
}
```

**Best Practices:**
- Use for frequently changing data
- Implement proper loading and error states
- Take advantage of built-in caching and revalidation
- Consider using for authenticated or user-specific content

## API Routes

Create API endpoints in the `pages/api` directory:

```tsx
// pages/api/user.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ name: 'John Doe' });
}
```

**Best Practices:**
- Keep API routes focused on a single responsibility
- Implement proper error handling and status codes
- Use middleware for authentication and validation
- Structure complex APIs with folders and route handlers

## Error Handling

Implement robust error handling for data fetching:

```tsx
// Minimal example with error handling
export async function getServerSideProps() {
  try {
    const res = await fetch('https://api.example.com/data');
    
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    
    const data = await res.json();
    return { props: { data } };
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return { 
      props: { 
        data: null, 
        error: 'Failed to load data' 
      } 
    };
  }
}
```

**Best Practices:**
- Always implement try/catch blocks
- Provide meaningful error messages
- Have fallback data for failed requests
- Log errors for debugging but sanitize sensitive information

## TypeScript Integration

Define types for your data and API responses:

```tsx
// Minimal TypeScript example
interface Post {
  id: number;
  title: string;
  content: string;
}

export const getStaticProps: GetStaticProps<{posts: Post[]}> = async () => {
  const res = await fetch('https://api.example.com/posts');
  const posts: Post[] = await res.json();
  
  return {
    props: { posts },
  };
};
```

**Best Practices:**
- Define interfaces for all API responses
- Use TypeScript utility types for variations of data
- Create shared types for reuse across components
- Type API route handlers for request and response