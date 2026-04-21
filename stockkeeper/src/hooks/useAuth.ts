import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserInfo {
  id_user: number;
  phone: string;
  roles: string[];
  display_name: string;
}

const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // match JWT lifetime
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const TOKEN_KEY = 'stockkeeper_token';
const USER_KEY = 'stockkeeper_user';

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      clearSession();
    }, IDLE_TIMEOUT_MS);
  }, [clearSession]);

  // Bootstrap auth check from localStorage, fallback sessionStorage for older sessions.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(parsedUser));
        setUser(parsedUser);
      } catch (e) {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // Lắng nghe hoạt động người dùng để reset idle timer
  useEffect(() => {
    if (!user) return;

    resetIdleTimer();

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [user, resetIdleTimer]);

  const login = (token: string, userInfo: UserInfo) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(userInfo);
  };

  const logout = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, logout, isAuthenticated: !!user };
};
