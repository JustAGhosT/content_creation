/**
 * Signup Page
 * Clean, minimal signup with benefit bullets and trust signals.
 * Uses existing auth API (POST /api/auth with action: 'register').
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/ui/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tokenStorage } from '@/lib/storage/token-storage';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from '@/styles/Signup.module.css';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface AuthProviderInfo {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { trackSignup, trackSignupStarted } = useAnalytics({ trackPageView: true });
  const signupStarted = useRef(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const getPasswordStrength = (
    pwd: string
  ): { label: string; level: 'weak' | 'fair' | 'strong' } => {
    if (pwd.length === 0) return { label: '', level: 'weak' };
    if (pwd.length < 8) return { label: 'Weak', level: 'weak' };
    if (pwd.length >= 12) {
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasNumber = /[0-9]/.test(pwd);
      const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
      if (hasUpper && hasLower && hasNumber && hasSpecial) {
        return { label: 'Strong', level: 'strong' };
      }
    }
    return { label: 'Fair', level: 'fair' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Fetch available auth providers on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchProviders() {
      try {
        const res = await fetch('/api/auth/providers', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.providers)) {
            setProviders(data.providers as AuthProviderInfo[]);
          }
        }
      } catch {
        // External providers unavailable — email/password still works
      } finally {
        if (!cancelled) {
          setProvidersLoading(false);
        }
      }
    }
    void fetchProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleProviderLogin = (providerId: string) => {
    const callbackUrl = `${window.location.origin}/api/auth/callback/${encodeURIComponent(providerId)}`;
    window.location.href =
      callbackUrl + `?redirect=${encodeURIComponent(window.location.origin + '/onboarding')}`;
  };

  const handleSignupStarted = () => {
    if (signupStarted.current) return;
    signupStarted.current = true;
    trackSignupStarted('email');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data: RegisterResponse | { message?: string } = await response.json();

      if (!response.ok) {
        const errorData = data as { message?: string };
        throw new Error(errorData.message ?? 'Registration failed');
      }

      const successData = data as RegisterResponse;

      // Store the token
      tokenStorage.setToken(successData.token);

      // Track signup completion
      trackSignup('email');

      // Redirect to onboarding
      router.push('/onboarding');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <LoadingSpinner size="lg" label="Checking authentication..." />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.headline}>Start Publishing Everywhere</h1>
          <p className={styles.subheadline}>Create once, publish to every platform in seconds.</p>

          <ul className={styles.benefits}>
            <li className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                &#10003;
              </span>
              Multi-platform publishing
            </li>
            <li className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                &#10003;
              </span>
              AI-powered formatting
            </li>
            <li className={styles.benefitItem}>
              <span className={styles.benefitIcon} aria-hidden="true">
                &#10003;
              </span>
              Analytics dashboard
            </li>
          </ul>

          {!providersLoading && providers.length > 0 && (
            <>
              <div className={styles.socialButtons}>
                {providers.map(provider => (
                  <button
                    key={provider.id}
                    type="button"
                    className={styles.socialButton}
                    onClick={() => handleProviderLogin(provider.id)}
                    disabled={loading}
                  >
                    Continue with {provider.name}
                  </button>
                ))}
              </div>
              <div className={styles.divider}>
                <span className={styles.dividerLine} />
                <span className={styles.dividerText}>or</span>
                <span className={styles.dividerLine} />
              </div>
            </>
          )}

          {error && (
            <div
              className={styles.errorMessage}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {escapeHtml(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} onFocusCapture={handleSignupStarted} name="signup-form">
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={styles.input}
                placeholder="Choose a username"
                disabled={loading}
                autoComplete="username"
                aria-required="true"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                aria-required="true"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                placeholder="At least 8 characters"
                disabled={loading}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby="password-strength password-requirements"
              />
              {password.length > 0 && (
                <div className={styles.strengthIndicator}>
                  <div className={styles.strengthBar}>
                    <div
                      className={`${styles.strengthFill} ${styles[`strength_${passwordStrength.level}`]}`}
                      role="progressbar"
                      aria-valuenow={
                        passwordStrength.level === 'weak'
                          ? 33
                          : passwordStrength.level === 'fair'
                            ? 66
                            : 100
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Password strength: ${passwordStrength.label}`}
                    />
                  </div>
                  <span
                    id="password-strength"
                    className={`${styles.strengthLabel} ${styles[`strength_${passwordStrength.level}`]}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              <p id="password-requirements" className={styles.passwordRequirements}>
                At least 8 characters, ideally 12+
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
              aria-busy={loading}
            >
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className={styles.loginLink}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>

          <div className={styles.trustSignals}>
            <span className={styles.trustItem}>Free forever plan</span>
            <span className={styles.trustDot}>&bull;</span>
            <span className={styles.trustItem}>No credit card required</span>
          </div>
        </div>
      </main>
    </>
  );
}
