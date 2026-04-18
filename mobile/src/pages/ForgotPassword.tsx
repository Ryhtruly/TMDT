import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiSmartphone, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../api/client';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../utils/phone';
import './Register.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(normalized)) { setError(vietnamPhoneError); return; }
    setLoading(true);
    try {
      await api.post('/shop/send-otp-forgot', { phone: normalized });
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi OTP, thử lại.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) { setError('Vui lòng nhập đầy đủ mã OTP 6 số.'); return; }
    setLoading(true);
    try {
      await api.post('/shop/verify-otp', { phone: normalizeVietnamPhone(phone), otp });
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã OTP không chính xác.');
    } finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirmPassword) { setError('Vui lòng nhập đầy đủ mật khẩu.'); return; }
    if (password !== confirmPassword) { setError('Mật khẩu nhập lại không khớp.'); return; }
    setLoading(true);
    try {
      await api.post('/shop/reset-password', {
        phone: normalizeVietnamPhone(phone),
        otp,
        password,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đặt lại mật khẩu thất bại.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="auth-page">
      <div className="auth-success-card">
        <FiCheckCircle size={52} color="#00b14f" />
        <h2>Đặt lại mật khẩu thành công!</h2>
        <p>Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
        <button className="auth-submit-btn" onClick={() => navigate('/login')}>Về Đăng Nhập</button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <button className="auth-back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/login')}>
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="auth-title">Quên mật khẩu</h1>
            <p className="auth-subtitle">Bước {step}/3</p>
          </div>
        </div>

        <div className="auth-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className={`auth-step ${s <= step ? 'active' : ''} ${s < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="auth-card">
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="auth-form">
              <div className="auth-form-icon">🔒</div>
              <h2 className="auth-form-title">Xác minh số điện thoại</h2>
              <p className="auth-form-desc">Nhập SĐT đã đăng ký để lấy lại mật khẩu</p>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <FiSmartphone className="auth-icon" size={17} />
                  <input
                    type="tel" inputMode="tel"
                    className="auth-input"
                    placeholder="VD: 0901234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel" required
                  />
                </div>
              </div>
              {error && <div className="auth-error"><FiAlertCircle size={14} /><span>{error}</span></div>}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Đang gửi OTP...</> : 'Gửi Mã OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-form-icon">🔑</div>
              <h2 className="auth-form-title">Nhập mã OTP</h2>
              <p className="auth-form-desc">Kiểm tra terminal backend để lấy mã</p>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <input
                    type="text" inputMode="numeric"
                    className="auth-input auth-input-center"
                    placeholder="_ _ _ _ _ _"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>
              </div>
              {error && <div className="auth-error"><FiAlertCircle size={14} /><span>{error}</span></div>}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Đang xác thực...</> : 'Xác Nhận OTP'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleReset} className="auth-form">
              <div className="auth-form-icon">✨</div>
              <h2 className="auth-form-title">Mật khẩu mới</h2>
              <p className="auth-form-desc">Tạo mật khẩu mạnh cho tài khoản</p>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <FiLock className="auth-icon" size={17} />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Mật khẩu mới"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <FiLock className="auth-icon" size={17} />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <div className="auth-error"><FiAlertCircle size={14} /><span>{error}</span></div>}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Đang cập nhật...</> : 'Đặt Lại Mật Khẩu'}
              </button>
            </form>
          )}
        </div>

        <p className="auth-footer">
          Nhớ mật khẩu rồi? <Link to="/login" className="auth-link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
