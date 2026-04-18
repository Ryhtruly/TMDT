import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiSmartphone, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import api from '../api/client';
import useAuth from '../hooks/useAuth';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../utils/phone';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) {
      setError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }
    const normalizedPhone = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      setError(vietnamPhoneError);
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', { phone: normalizedPhone, password });
      if (res?.status === 'success') {
        const token = res.accessToken;
        const user = res.user_info;
        const isShipper = user?.roles?.includes('SHIPPER');
        const isStockkeeper = user?.roles?.includes('STOCKKEEPER');

        if (!isShipper && !isStockkeeper) {
          setError('Tài khoản này không có quyền truy cập ứng dụng vận hành. Liên hệ Admin!');
          setLoading(false);
          return;
        }
        
        login(token, user);
        
        if (isShipper) {
          navigate('/dashboard');
        } else if (isStockkeeper) {
          navigate('/stock/inventory');
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* ===== HERO TOP ===== */}
        <div className="login-hero">
          <div className="login-logo-static">
            <span className="login-logo-icon">🚀</span>
          </div>
          <h1 className="login-title">GHST Logistics</h1>
          <p className="login-subtitle">Đăng nhập để bắt đầu ca làm việc</p>
        </div>

        {/* ===== FORM CARD ===== */}
        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Phone */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-phone">Số điện thoại</label>
              <div className="login-input-wrap">
                <FiSmartphone className="login-icon" size={17} />
                <input
                  id="login-phone"
                  type="tel"
                  className="login-input"
                  placeholder="VD: 0901234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-pass">Mật khẩu</label>
              <div className="login-input-wrap">
                <FiLock className="login-icon" size={17} />
                <input
                  id="login-pass"
                  type={showPw ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPw ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot Password link */}
            <div className="login-forgot-wrap">
              <Link to="/forgot-password" className="login-forgot-link">Quên mật khẩu?</Link>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error animate-slide-up">
                <FiAlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng Nhập'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="login-register-wrap">
            <span>Chưa có tài khoản?</span>
            <Link to="/register" className="login-register-link">Đăng ký ngay</Link>
          </div>
        </div>

        {/* Footer */}
        <p className="login-footer">
          Chỉ dành cho tài khoản <strong>Shipper</strong> &amp; <strong>Thủ Kho</strong>
        </p>
      </div>
    </div>
  );
};

export default Login;
