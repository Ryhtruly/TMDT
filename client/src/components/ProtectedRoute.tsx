import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute — Chặn truy cập nếu chưa đăng nhập.
 * Token được lưu trong localStorage với key 'shop_token'.
 * Nếu chưa có token → redirect về /login.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem('shop_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
