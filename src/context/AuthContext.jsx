import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token on mount
    const token = localStorage.getItem('crickethub_token');
    const username = localStorage.getItem('crickethub_username');
    if (token && username) {
      setUser({ token, username });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('crickethub_token', userData.token);
    localStorage.setItem('crickethub_username', userData.username);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('crickethub_token');
    localStorage.removeItem('crickethub_username');
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
