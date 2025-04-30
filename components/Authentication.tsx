import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

const Authentication: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/auth/user');
        setUser(response.data);
try {
  const response = await axios.get('/api/auth/user');
  setUser(response.data);
} catch (err: unknown) {
  const error = err as Error & {
    response?: {
      data?: { message?: string },
      status?: number
    }
  };
  setError(error.response?.data?.message || error.message);
}
      }
    };

    fetchUser();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', { username, password });
      setUser(response.data);
      const response = await axios.post('/api/auth/login', { username, password });
      setUser(response.data);
    } catch (err: unknown) {
      const error = err as Error & { 
        response?: { 
          data?: { message?: string },
          status?: number
        },
        request?: unknown
      };
      // …now update the rest of the error handling below to use `error` instead of `err`
      let errorMessage = 'An error occurred during login.';
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Invalid username or password.';
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (err: unknown) {
      const error = err as Error & {
        response?: {
          data?: { message?: string }
        }
      };
      setError(error.response?.data?.message || error.message);
    }
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <h2>Authentication</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {isLoading && <p>Loading...</p>}
      {user ? (
        <div>
          <p>Welcome, {user.name}</p>
          <button onClick={logout} disabled={isLoading}>Logout</button>
        </div>
      ) : (
        <div>
          <h3>Login</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { username, password } = e.target.elements as typeof e.target.elements & {
                username: { value: string };
                password: { value: string };
              };
              login(username.value, password.value);
            }}
          >
            <div>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                minLength={4}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                minLength={8}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Authentication;
