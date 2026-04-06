import { useState } from 'react';

const useAuth = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('shipper_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('shipper_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (newToken: string, userInfo: any) => {
    localStorage.setItem('shipper_token', newToken);
    localStorage.setItem('shipper_user', JSON.stringify(userInfo));
    setToken(newToken);
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('shipper_token');
    localStorage.removeItem('shipper_user');
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

export default useAuth;
