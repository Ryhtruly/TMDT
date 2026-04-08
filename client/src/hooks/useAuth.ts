import { useState } from 'react';

const useAuth = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('shop_token'));
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('shop_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (newToken: string, userInfo: any) => {
    localStorage.setItem('shop_token', newToken);
    localStorage.setItem('shop_user', JSON.stringify(userInfo));
    setToken(newToken);
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('shop_token');
    localStorage.removeItem('shop_user');
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

export default useAuth;
