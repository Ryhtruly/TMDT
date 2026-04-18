import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiSmartphone, FiLock, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../api/client';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../utils/phone';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    full_name: '',
    password: '',
    confirm_password: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }));

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizeVietnamPhone(formData.phone);
    if (!isValidVietnamPhone(normalized)) { setError(vietnamPhoneError); return; }
    setLoading(true);
    try {
      await api.post('/shop/send-otp', { phone: normalized });
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
      await api.post('/shop/verify-otp', { phone: normalizeVietnamPhone(formData.phone), otp });
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã OTP không chính xác.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.full_name || !formData.password || !formData.confirm_password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    const normalizedPhone = normalizeVietnamPhone(formData.phone);
    setLoading(true);
    try {
      const res: any = await api.post('/shop/register', {
        phone: normalizedPhone,
        full_name: formData.full_name,
        email: `${normalizedPhone}@ghst.vn`, // auto email placeholder
        shop_name: formData.full_name,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });
      if (res?.status === 'success') setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đăng ký thất bại, thử lại.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="auth-page">
      <div className="auth-success-card">
        <FiCheckCircle size={52} color="#00b14f" />
        <h2>Đăng ký thành công!</h2>
        <p>Tài khoản của bạn đang chờ Admin phê duyệt và phân quyền.</p>
        <button className="auth-submit-btn" onClick={() => navigate('/login')}>Về Đăng Nhập</button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Header */}
        <div className="auth-header">
          <button className="auth-back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/login')}>
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="auth-title">Đăng ký tài khoản</h1>
            <p className="auth-subtitle">Bước {step}/3</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="auth-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className={`auth-step ${s <= step ? 'active' : ''} ${s < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="auth-card">
          {/* Step 1: Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="auth-form">
              <div className="auth-form-icon">📱</div>
              <h2 className="auth-form-title">Số điện thoại</h2>
              <p className="auth-form-desc">Nhập SĐT để nhận mã xác minh</p>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <FiSmartphone className="auth-icon" size={17} />
                  <input
                    type="tel" inputMode="tel"
                    className="auth-input"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={e => update('phone', e.target.value)}
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

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-form-icon">🔑</div>
              <h2 className="auth-form-title">Nhập mã OTP</h2>
              <p className="auth-form-desc">Mã đã gửi đến <strong>{formData.phone}</strong> — kiểm tra terminal backend</p>
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

          {/* Step 3: Account Info */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-form-icon">👤</div>
              <h2 className="auth-form-title">Thông tin tài khoản</h2>
              <p className="auth-form-desc">Tạo mật khẩu cho tài khoản của bạn</p>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <FiUser className="auth-icon" size={17} />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Họ và tên"
                    value={formData.full_name}
                    onChange={e => update('full_name', e.target.value)}
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
                    placeholder="Mật khẩu mới"
                    value={formData.password}
                    onChange={e => update('password', e.target.value)}
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
                    value={formData.confirm_password}
                    onChange={e => update('confirm_password', e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <div className="auth-error"><FiAlertCircle size={14} /><span>{error}</span></div>}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <><span className="spinner-sm" /> Đang đăng ký...</> : 'Hoàn Tất Đăng Ký'}
              </button>
            </form>
          )}
        </div>

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
