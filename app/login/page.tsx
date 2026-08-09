/**
 * Login Page
 * Login page with optional external identity providers and local credentials
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/ui/Header';
import ProductStatus from '@/components/ui/ProductStatus';
import styles from '@/styles/LoginForm.module.css';
import pageStyles from './page.module.css';

interface AuthProviderInfo {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

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
        // External providers unavailable - email/password still works when provisioned
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
      callbackUrl + `?redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign-in failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className={pageStyles.main}>
          <div className={pageStyles.loadingContainer}>Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={pageStyles.main}>
        <div className={styles.loginContainer}>
          <ProductStatus variant="signIn" showDescription />
          <h1 className={styles.title}>Sign in to OmniPost</h1>

          {!providersLoading && providers.length > 0 && (
            <>
              <div className={pageStyles.socialButtons}>
                {providers.map(provider => (
                  <button
                    key={provider.id}
                    type="button"
                    className={pageStyles.socialButton}
                    onClick={() => handleProviderLogin(provider.id)}
                    disabled={loading}
                  >
                    Continue with {provider.name}
                  </button>
                ))}
              </div>
              <div className={pageStyles.divider}>
                <span className={pageStyles.dividerLine} />
                <span className={pageStyles.dividerText}>or</span>
                <span className={pageStyles.dividerLine} />
              </div>
            </>
          )}

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
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
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {!providersLoading && providers.length === 0 && (
            <p className={pageStyles.hint}>
              Mystira Identity sign-in is not configured for this environment yet. Use a provisioned
              OmniPost account when one is available.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
