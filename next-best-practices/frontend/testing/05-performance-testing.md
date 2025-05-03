# Performance Testing in Next.js

## Table of Contents
- [Introduction](#introduction)
- [Setup](#setup)
- [Lighthouse Testing](#lighthouse-testing)
- [Core Web Vitals Testing](#core-web-vitals-testing)
- [Bundle Size Analysis](#bundle-size-analysis)
- [Load Testing](#load-testing)
- [Best Practices](#best-practices)

## Introduction

Performance testing ensures your Next.js application delivers a fast, responsive experience to users. It focuses on metrics like page load time, time to interactive, bundle size, and server response time.

## Setup

Use Lighthouse, Next.js Analytics, and custom tooling:

```js
// Minimal Lighthouse CI setup
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/about'],
      startServerCommand: 'npm run start',
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
  },
};
```

## Lighthouse Testing

Automate Lighthouse testing in CI:

```js
// Minimal example with GitHub Actions
// .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: './lighthouserc.js'
```

## Core Web Vitals Testing

Monitor Core Web Vitals with Next.js Analytics:

```jsx
// Minimal example in _app.js
export function reportWebVitals(metric) {
  // Send to analytics service
  console.log(metric);
}
```

## Bundle Size Analysis

Analyze bundle size with @next/bundle-analyzer:

```js
// Minimal setup in next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

Run with:

```bash
ANALYZE=true npm run build
```

## Load Testing

Basic load testing with k6:

```js
// Minimal k6 script
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function() {
  const res = http.get('http://localhost:3000');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'page loads in less than 1s': (r) => r.timings.duration < 1000,
  });
  sleep(1);
}

// Run with: k6 run --vus 10 --duration 30s load-test.js
```

## Best Practices

1. **Measure Core Web Vitals**
   - Focus on LCP (Largest Contentful Paint)
   - Monitor FID (First Input Delay)
   - Track CLS (Cumulative Layout Shift)
   - Set performance budgets for each metric

2. **Automate Performance Testing**
   - Include performance tests in CI pipeline
   - Compare results against previous builds
   - Set thresholds for acceptable performance

3. **Monitor Real User Metrics**
   - Collect field data from actual users
   - Use Next.js Analytics or third-party RUM tools
   - Track performance across different devices and connections

4. **Optimize Bundle Size**
   - Regularly analyze bundle composition
   - Identify and remove unused dependencies
   - Implement code splitting for large pages
   - Use dynamic imports for non-critical components

5. **Test Server Performance**
   - Measure TTFB (Time To First Byte)
   - Test API route response times
   - Verify SSR performance under load
   - Test ISR revalidation performance

6. **Test on Representative Devices**
   - Include mobile devices in testing
   - Test on low-end devices
   - Simulate various network conditions
   - Test with CPU throttling