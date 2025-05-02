# Next.js Performance Optimization Best Practices

## Table of Contents
- [Core Web Vitals](#core-web-vitals)
- [Image Optimization](#image-optimization)
- [Code Splitting](#code-splitting)
- [Bundle Size Optimization](#bundle-size-optimization)
- [Font Optimization](#font-optimization)
- [Component Optimization](#component-optimization)
- [Server-Side Optimization](#server-side-optimization)
- [Monitoring and Analytics](#monitoring-and-analytics)

## Core Web Vitals

Focus on these key performance metrics:

| Metric | Description | Target |
|--------|-------------|--------|
| LCP (Largest Contentful Paint) | Time until largest content element is visible | < 2.5s |
| FID (First Input Delay) | Time until page responds to user interaction | < 100ms |
| CLS (Cumulative Layout Shift) | Visual stability measurement | < 0.1 |
| TTFB (Time to First Byte) | Time until first byte of response is received | < 800ms |

**Best Practices:**
- Prioritize above-the-fold content loading
- Defer non-critical resources
- Implement proper image dimensions and aspect ratios
- Use Next.js built-in performance features

## Image Optimization

Use Next.js Image component for automatic optimization:

```tsx
import Image from 'next/image';

// Responsive image that fills its container
<Image
  src="/profile.jpg"
  alt="Profile"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  priority={isAboveTheFold}
/>

// Fixed size image
<Image
  src="/icon.png"
  alt="Icon"
  width={40}
  height={40}
/>
```

**Best Practices:**
- Always specify width and height or use fill with proper sizing
- Add the `priority` attribute for above-the-fold images
- Use the `sizes` attribute for responsive images
- Consider using blur placeholders for large images
- Serve images in modern formats (WebP, AVIF)

## Code Splitting

Next.js automatically code-splits by pages. Enhance with:

```tsx
// Dynamic import with loading state
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(
  () => import('../components/HeavyComponent'),
  {
    loading: () => <p>Loading...</p>,
    ssr: false, // Disable SSR if component uses browser APIs
  }
);
```

**Best Practices:**
- Use dynamic imports for large components not needed immediately
- Split large pages into smaller components
- Lazy load below-the-fold content
- Disable SSR for components that only work client-side

## Bundle Size Optimization

Monitor and reduce your JavaScript bundle size:

```bash
# Analyze bundle size
npx next build && npx next analyze
```

**Best Practices:**
- Import only what you need from libraries
- Use tree-shakable libraries
- Replace large dependencies with smaller alternatives
- Implement proper code splitting
- Consider using the Next.js Webpack Bundle Analyzer plugin

## Font Optimization

Optimize font loading with Next.js font system:

```tsx
// pages/_app.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function MyApp({ Component, pageProps }) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
```

**Best Practices:**
- Use `next/font` for automatic optimization
- Limit font weights and styles
- Use `font-display: swap` to prevent invisible text
- Consider using variable fonts for multiple weights
- Preload critical fonts

## Component Optimization

Optimize React components for better performance:

```tsx
// Memoize expensive components
const MemoizedComponent = React.memo(ExpensiveComponent);

// Use virtualization for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Best Practices:**
- Use React.memo for expensive components
- Implement virtualization for long lists
- Avoid unnecessary re-renders with proper key usage
- Use the useCallback and useMemo hooks appropriately
- Debounce or throttle event handlers for scroll/resize events

## Server-Side Optimization

Optimize server-side rendering and data fetching:

```tsx
// Parallel data fetching
export async function getServerSideProps() {
  const [userData, postsData] = await Promise.all([
    fetch('https://api.example.com/user').then(res => res.json()),
    fetch('https://api.example.com/posts').then(res => res.json()),
  ]);
  
  return {
    props: {
      user: userData,
      posts: postsData,
    },
  };
}
```

**Best Practices:**
- Use Incremental Static Regeneration when possible
- Implement proper caching headers
- Fetch data in parallel
- Consider using edge functions for faster responses
- Optimize database queries and API calls

## Monitoring and Analytics

Implement performance monitoring:

```tsx
// Example with Next.js Analytics
export function reportWebVitals(metric) {
  // Analytics implementation
  console.log(metric);
}

// pages/_app.js
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    sendToAnalytics('web-vital', metric);
  }
}
```

**Best Practices:**
- Use Next.js built-in web vitals reporting
- Implement Real User Monitoring (RUM)
- Set up performance budgets
- Monitor Core Web Vitals
- Create performance dashboards for tracking improvements