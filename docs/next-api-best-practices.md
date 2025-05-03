# Next.js API Best Practices

## Introduction

This document outlines the best practices for implementing APIs in Next.js applications, focusing on the transition from the traditional `pages/api` structure to the newer App Router API approach with Route Handlers.

## API Implementation Approaches in Next.js

### 1. Pages Router API Routes (`pages/api/`)

The traditional approach using the Pages Router:

- APIs are defined in the `pages/api` directory
- Each file becomes an API endpoint automatically
- Uses `NextApiRequest` and `NextApiResponse` types
- Supports middleware via HOCs (Higher Order Components)

```typescript
// Example: pages/api/example.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Success' })
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
```

### 2. App Router Route Handlers (Recommended)

The modern approach using the App Router:

- APIs are defined in `app/api` directory using the `route.ts` or `route.js` naming convention
- Uses Web standard Request and Response objects
- Supports HTTP methods via named exports (`GET`, `POST`, etc.)
- Built-in support for caching and revalidation

```typescript
// Example: app/api/example/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Success' })
}

export async function POST(request: Request) {
  const data = await request.json()
  return NextResponse.json({ received: data })
}
```

## Best Practices for Next.js APIs

### 1. Use App Router Route Handlers

- Adopt the newer Route Handlers approach for all new APIs
- Organize by feature/domain rather than HTTP method
- Use the `route.ts` naming convention

### 2. HTTP Method Handling

- Export named functions for each supported HTTP method (`GET`, `POST`, etc.)
- Return proper status codes and error messages
- Validate request methods explicitly

### 3. Request and Response Handling

- Use the Web standard `Request` object and `NextResponse`
- Parse request data appropriately:
  ```typescript
  // JSON data
  const data = await request.json()
  
  // Form data
  const formData = await request.formData()
  
  // URL parameters
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  ```

### 4. Error Handling

- Implement consistent error responses
- Use try/catch blocks for async operations
- Return appropriate HTTP status codes

```typescript
export async function POST(request: Request) {
  try {
    const data = await request.json()
    // Process data
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
```

### 5. Authentication and Authorization

- Use middleware for authentication
- Implement route segment config for protection:

```typescript
export const config = {
  runtime: 'edge',
  matcher: '/api/:path*',
}
```

### 6. API Organization

- Group related endpoints in directories
- Use dynamic segments for parameterized routes:
  - `app/api/users/[id]/route.ts`
- Separate business logic from route handlers

### 7. Caching and Performance

- Leverage built-in caching capabilities:

```typescript
export async function GET() {
  return NextResponse.json(
    { data: 'cached data' },
    {
      headers: {
        'Cache-Control': 'max-age=3600',
      },
    }
  )
}
```

- Use `revalidatePath` and `revalidateTag` for on-demand revalidation

### 8. Type Safety

- Define strong types for request and response data
- Use zod or similar libraries for runtime validation

### 9. Testing

- Write unit tests for API handlers
- Use mocking for external dependencies
- Test error cases and edge conditions

## Migration Strategy

When migrating from Pages API routes to App Router Route Handlers:

1. Start with non-critical, simpler endpoints
2. Create the new route handler in parallel with the existing endpoint
3. Update clients to use the new endpoint
4. Once verified, remove the old endpoint

## Conclusion

Adopting the App Router Route Handlers provides several advantages including better performance, more intuitive API design, and improved developer experience. Following these best practices will help ensure a smooth transition and maintainable API architecture.