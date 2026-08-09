import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const readSource = (...segments: string[]) =>
  readFileSync(join(process.cwd(), ...segments), 'utf8');

describe('Private Preview product-status mounts', () => {
  test('uses the shared status component on sign-in, authenticated header, and footer', () => {
    const login = readSource('app', 'login', 'page.tsx');
    const header = readSource('components', 'ui', 'Header.tsx');
    const footer = readSource('components', 'ui', 'SharedFooter.tsx');

    expect(login).toContain('<ProductStatus variant="signIn" showDescription />');
    expect(header).toContain('isAuthenticated && <ProductStatus variant="header" />');
    expect(footer).toContain('<ProductStatus variant="footer" showDescription />');
  });

  test('defines the truthful status words in one source only', () => {
    const status = readSource('lib', 'product-status.ts');
    const surfaces = [
      readSource('app', 'login', 'page.tsx'),
      readSource('components', 'ui', 'Header.tsx'),
      readSource('components', 'ui', 'SharedFooter.tsx'),
    ].join('\n');

    expect(status).toContain("label: 'Private Preview'");
    expect(surfaces).not.toContain('Private Preview');
  });
});
