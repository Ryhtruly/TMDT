import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSmartphone, FiLock, FiEye, FiEyeOff, FiZap, FiAlertCircle } from 'react-icons/fi';
import api from '../api/client';
import useAuth from '../hooks/useAuth';
import './Login.css';

const DEMO_CREDENTIALS = [
  { label: 'Shipper 1', phone: '0933445566', pass: 'Shipper1@123' },
  { label: 'Thủ kho (Demo)', phone: '0999000222', pass: '111' }, // Dummy password for fallback visualization if we add one, actually let's use a real one if I know
];

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
    setLoading(true);
    try {
      const res: any = await api.post('/auth/login', { phone, password });
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
        
        // Điều hướng thông minh dựa trên Role
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

  const fillDemo = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setPhone(cred.phone);
    setPassword(cred.pass);
    setError('');
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-container">
        {/* ===== HERO TOP ===== */}
        <div className="login-hero">
          <div className="login-logo">
            <div className="login-logo-ring">
              <div className="login-logo-inner">
                <FiZap size={30} />
              </div>
            </div>
          </div>
          <div className="login-moto-art">
            {/* CSS art delivery scooter */}
            <div className="scooter">
              <div className="scooter-body" />
              <div className="scooter-wheel scooter-wheel-front" />
              <div className="scooter-wheel scooter-wheel-back" />
              <div className="scooter-speed-line sl-1" />
              <div className="scooter-speed-line sl-2" />
              <div className="scooter-speed-line sl-3" />
            </div>
          </div>
          <h1 className="login-title">GHST Logistics</h1>
          <p className="login-subtitle">Đăng nhập để bắt đầu ca làm việc ⚡</p>
        </div>

        {/* ===== FORM CARD ===== */}
        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Phone */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-phone">
                Số điện thoại
              </label>
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
              <label className="login-label" htmlFor="login-pass">
                Mật khẩu
              </label>
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
              className="btn-primary login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  Đang đăng nhập...
                </>
              ) : (
                '⚡ Bắt Đầu Ca Làm Việc'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="login-demo">
            <div className="login-demo-label">
              <span>Tài khoản thử nghiệm</span>
            </div>
            <div className="login-demo-list">
              {DEMO_CREDENTIALS.map(c => (
                <button
                  key={c.phone}
                  className="login-demo-btn"
                  onClick={() => fillDemo(c)}
                  type="button"
                >
                  <div className="demo-avatar">{c.label[c.label.length - 1]}</div>
                  <div>
                    <div className="demo-name">{c.label}</div>
                    <div className="demo-phone">{c.phone}</div>
                  </div>
                </button>
              ))}
            </div>
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
