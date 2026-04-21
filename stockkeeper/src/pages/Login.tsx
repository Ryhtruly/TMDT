import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPhone, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../utils/phone';
import './Login.css';

const Login = () => {
  const [phone, setPhone] = useState('0901234567');
  const [password, setPassword] = useState('STOCKKEEPER@123');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedPhone = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      setError(vietnamPhoneError);
      return;
    }
    setIsLoading(true);

    try {
      const response: any = await apiClient.post('/auth/login', { phone: normalizedPhone, password });
      if (response?.status === 'success') {
        const checkRole =
          response.user_info?.roles?.includes('STOCKKEEPER') || response.user_info?.roles?.includes('STOCKKEEPER');
        if (!checkRole) {
          setError('Tài khoản không có quyền truy cập trang Quản Trị.');
          setIsLoading(false);
          return;
        }

        login(response.accessToken || response.token, response.user_info);
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
                type={showPw ? 'text' : 'password'} 
                placeholder="Nhập mật khẩu" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
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
