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

  test('preserves campaign attribution through new external-provider signups', () => {
    const signupPage = fs.readFileSync(path.join(process.cwd(), 'app/signup/page.tsx'), 'utf8');
    const callback = fs.readFileSync(
      path.join(process.cwd(), 'app/api/auth/callback/[provider]/route.ts'),
      'utf8'
    );

    expect(signupPage).toContain("callbackUrl.searchParams.set('campaign_token', campaignToken)");
    expect(callback).toContain('campaignToken: storedState.campaignToken');
    expect(callback).toContain('value.length <= MAX_CAMPAIGN_TOKEN_LENGTH');
    expect(callback).toContain("name: 'signup_started'");
    expect(callback).toContain("name: 'signup_completed'");
    expect(callback).toContain('if (isNewUser)');
  });
});
