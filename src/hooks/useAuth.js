import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const ACCOUNT_PROFILE_KEY = 'accountProfile';

const getLocalIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStoredUser = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const loginDate = localStorage.getItem('loginDate');
  const rawProfile = localStorage.getItem(ACCOUNT_PROFILE_KEY);
  let profile = null;

  if (rawProfile) {
    try {
      profile = JSON.parse(rawProfile);
    } catch (error) {
      profile = null;
    }
  }

  if (token && role) {
    return { role, userId, token, loginDate, profile };
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

  const login = useCallback((role, userId = null, token = `${role}-token-${Date.now()}`, profile = null) => {
    const loginDate = getLocalIsoDate();
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('loginDate', loginDate);
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(profile || {}));

    if (userId !== null && userId !== undefined) {
      localStorage.setItem('userId', String(userId));
    } else {
      localStorage.removeItem('userId');
    }

    setUser({
      role,
      userId: userId !== null && userId !== undefined ? String(userId) : null,
      token,
      loginDate,
      profile: profile || {},
    });
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('loginDate');
    localStorage.removeItem(ACCOUNT_PROFILE_KEY);
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
