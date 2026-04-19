import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserInfo {
  id_user: number;
  phone: string;
  roles: string[];
  display_name: string;
}

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('stockkeeper_token');
    sessionStorage.removeItem('stockkeeper_user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      clearSession();
    }, IDLE_TIMEOUT_MS);
  }, [clearSession]);

  // Bootstrap auth check từ sessionStorage (tự xóa khi đóng tab/trình duyệt)
  useEffect(() => {
    const token = sessionStorage.getItem('stockkeeper_token');
    const savedUser = sessionStorage.getItem('stockkeeper_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
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
    sessionStorage.setItem('stockkeeper_token', token);
    sessionStorage.setItem('stockkeeper_user', JSON.stringify(userInfo));
    setUser(userInfo);
  };

  const logout = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    sessionStorage.removeItem('stockkeeper_token');
    sessionStorage.removeItem('stockkeeper_user');
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, logout, isAuthenticated: !!user };
};
