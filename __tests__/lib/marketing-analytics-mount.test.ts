/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('marketing attribution mount', () => {
  test('tracks each marketing pathname once from the persistent layout', () => {
    const layout = readFileSync(join(process.cwd(), 'app', '(marketing)', 'layout.tsx'), 'utf8');
    const pricing = readFileSync(
      join(process.cwd(), 'app', '(marketing)', 'pricing', 'page.tsx'),
      'utf8'
    );

    expect(layout).toContain("import { useAnalytics } from '@/hooks/useAnalytics'");
    expect(layout).toContain('usePathname()');
    expect(layout).toContain('useAnalytics({ trackPageView: false })');
    expect(layout).toContain('trackPageView();');
    expect(pricing).toContain('useAnalytics({ trackPageView: false })');
  });
});
