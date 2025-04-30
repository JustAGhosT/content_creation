import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Authentication = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/auth/user');
        setUser(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUser();
  }, []);

  // add this at the top of your component (if not already there)
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', { username, password });
      setUser(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Authentication</h2>
      {error && <p>Error: {error}</p>}
      {user ? (
        <div>
          <p>Welcome, {user.name}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <h3>Login</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { username, password } = e.target.elements;
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
                minLength="4"
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                minLength="8"
                required
              />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Authentication;
