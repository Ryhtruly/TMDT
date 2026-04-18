import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTruck, FiArrowLeft } from 'react-icons/fi';
import apiClient from '../../api/client';
import useAuth from '../../hooks/useAuth';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../../utils/phone';
import './Auth.css';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    const normalizedPhone = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      setError(vietnamPhoneError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/login', { phone: normalizedPhone, password }) as any;
      
      if (res && res.status === 'success') {
        const checkRole = res.user_info?.roles?.includes('SHOP');
        if (!checkRole) {
          setError('Tài khoản này không phải là Shop. Vui lòng đăng nhập trang nội bộ.');
          return;
        }

        login(res.accessToken, res.user_info);
        navigate('/dashboard'); 
      } else {
        setError('Thông tin đăng nhập không hợp lệ.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-graphic">
        <div className="auth-graphic-content">
          <div className="truck-icon-wrapper"><FiTruck /></div>
          <h2>Quản Lý Shop Dễ Dàng</h2>
          <p>Tham gia mạng lưới giao hàng thông minh. Rút ngắn thời gian vận hành, tối ưu biên độ lợi nhuận.</p>
        </div>
      </div>
      
      <div className="auth-form-container">
        <Link to="/" className="back-to-home"><FiArrowLeft /> Quay về Trang chủ</Link>
        <div className="auth-header">
          <h1>Đăng Nhập Shop</h1>
          <p>Chào mừng trở lại! Vui lòng điền thông tin để tiếp tục.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Số điện thoại</label>
            <input 
              type="text" 
              className="form-control form-control-lg" 
              placeholder="Nhập SĐT..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              className="form-control form-control-lg" 
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng Nhập Ngay'}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản Shop? 
          <Link to="/register" className="auth-link">Đăng Ký Khách Hàng Mới</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
