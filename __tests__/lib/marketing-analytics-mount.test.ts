/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('marketing attribution mount', () => {
  test('mounts analytics in the shared marketing layout', () => {
    const layout = readFileSync(join(process.cwd(), 'app', '(marketing)', 'layout.tsx'), 'utf8');

    expect(layout).toContain("import { useAnalytics } from '@/hooks/useAnalytics'");
    expect(layout).toContain('useAnalytics({ trackPageView: true })');
  });
});
