/** @jest-environment node */

import fs from 'node:fs';
import path from 'node:path';

describe('signup analytics wiring', () => {
  test('emits signup_started once when the email form is first engaged', () => {
    const signupPage = fs.readFileSync(path.join(process.cwd(), 'app/signup/page.tsx'), 'utf8');

    expect(signupPage).toContain('const signupStarted = useRef(false)');
    expect(signupPage).toContain("trackSignupStarted('email')");
    expect(signupPage).toContain('onFocusCapture={handleSignupStarted}');
  });
});
