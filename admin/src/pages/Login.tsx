import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPhone, FiLock } from 'react-icons/fi';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
  const [phone, setPhone] = useState('0901234567');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { phone, password });
      if (response && response.status === 'success') {
        const checkRole = response.user_info?.roles?.includes('ADMIN') || response.user_info?.roles?.includes('STOCKKEEPER');
        if (!checkRole) {
          setError('Tài khoản không có quyền truy cập trang Quản Trị.');
          setIsLoading(false);
          return;
        }

        login(response.accessToken, response.user_info);
        navigate('/');
      } else {
        setError('Thông tin đăng nhập không hợp lệ');
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo text-primary">GHN SYSTEM</h1>
          <p className="login-subtitle">Hệ Thống Quản Trị Logistics</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Số điện thoại</label>
            <div className="input-wrapper">
              <FiPhone className="input-icon" />
              <input 
                type="text" 
                placeholder="Nhập số điện thoại" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Mật khẩu</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input 
                type="password" 
                placeholder="Nhập mật khẩu" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="login-btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
