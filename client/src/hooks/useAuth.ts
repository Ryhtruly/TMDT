import { useState, useEffect, useCallback, useRef } from 'react';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

const useAuth = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('shop_token'));
  const [user, setUser] = useState<any>(() => {
    const savedUser = sessionStorage.getItem('shop_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('shop_token');
    sessionStorage.removeItem('shop_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      clearSession();
    }, IDLE_TIMEOUT_MS);
  }, [clearSession]);

  // Lắng nghe hoạt động người dùng để reset idle timer
  useEffect(() => {
    if (!token) return;

    resetIdleTimer();

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [token, resetIdleTimer]);

  const login = (newToken: string, userInfo: any) => {
    sessionStorage.setItem('shop_token', newToken);
    sessionStorage.setItem('shop_user', JSON.stringify(userInfo));
    setToken(newToken);
    setUser(userInfo);
  };

  const logout = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    sessionStorage.removeItem('shop_token');
    sessionStorage.removeItem('shop_user');
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

export default useAuth;
