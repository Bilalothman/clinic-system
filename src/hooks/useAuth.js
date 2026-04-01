import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const getStoredUser = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  if (token && role) {
    return { role, userId, token };
  }

  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserFromStorage = useCallback(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    syncUserFromStorage();
  }, [syncUserFromStorage]);

  useEffect(() => {
    const handleStorageChange = () => {
      syncUserFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncUserFromStorage]);

  const login = useCallback((role, userId = null, token = `${role}-token-${Date.now()}`) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);

    if (userId !== null && userId !== undefined) {
      localStorage.setItem('userId', String(userId));
    } else {
      localStorage.removeItem('userId');
    }

    setUser({
      role,
      userId: userId !== null && userId !== undefined ? String(userId) : null,
      token,
    });
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      getUserFromStorage: getStoredUser,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
