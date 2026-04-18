import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTruck, FiArrowLeft } from 'react-icons/fi';
import apiClient from '../../api/client';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../../utils/phone';
import './Auth.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    shop_name: '',
    password: '',
    confirm_password: ''
  });
  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 10 chữ số).');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await apiClient.post('/shop/send-otp', { phone: formData.phone });
      setStep(2);
      // Removed the fake alert, now the user checks backend terminal for OTP
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || otpValue.length < 6) {
      setError('Vui lòng nhập mã OTP 6 số.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/shop/verify-otp', { phone: formData.phone, otp: otpValue });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.email || !formData.password || !formData.confirm_password || !formData.shop_name) {
      setError('Vui lòng nhập đầy đủ Tên tài khoản, Email, Mật khẩu và Nhập lại mật khẩu.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    const normalizedPhone = normalizeVietnamPhone(formData.phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      setError(vietnamPhoneError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/shop/register', { ...formData, phone: normalizedPhone }) as any;
      if (res && res.status === 'success') {
        setSuccess(true);
        setTimeout(() => { navigate('/login'); }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Xin thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-graphic" style={{background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'}}>
        <div className="auth-graphic-content">
          <div className="truck-icon-wrapper"><FiTruck /></div>
          <h2>Bắt Đầu Bán Hàng</h2>
          <p>Trở thành đối tác kinh doanh với giải pháp vận chuyển tối ưu.</p>
        </div>
      </div>
      
      <div className="auth-form-container">
        <Link to="/" className="back-to-home"><FiArrowLeft /> Quay về Trang chủ</Link>
        <div className="auth-header" style={{marginBottom: '20px'}}>
          <h1>Đăng Ký Khách Mới</h1>
          <p>Mở tài khoản Chủ Cửa Hàng miễn phí - {step === 1 ? 'Bước 1/3' : step === 2 ? 'Bước 2/3' : 'Bước 3/3'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{background: 'var(--success-bg)', color: 'var(--success)'}}>Đăng ký thành công! Đang chuyển hướng...</div>}

        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label>Số điện thoại định danh *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="VD: 0987654321"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
              />
              <small style={{color: '#6b7280', fontSize: '0.8rem', marginTop: '4px', display: 'block'}}>
                Hệ thống sẽ dùng SĐT này để gửi mã OTP xác thực và làm tài khoản đăng nhập.
              </small>
            </div>
            <button type="submit" className="btn-primary btn-full">
              Gửi mã OTP (Tiếp Tục)
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label>Mã xác thực OTP gửi đến số {formData.phone} *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Nhập 6 số OTP (Demo: 123456)"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').substring(0, 6))}
                maxLength={6}
              />
            </div>
             <button type="submit" className="btn-primary btn-full">
              Xác nhận OTP
            </button>
            <div style={{marginTop: '12px', textAlign: 'center'}}>
              <span style={{color: '#6d28d9', cursor: 'pointer', fontSize: '0.9rem'}} onClick={() => setStep(1)}>
                Dùng số điện thoại khác?
              </span>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Tên tài khoản (Tên Cửa Hàng) *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="VD: Thế Giới Di Động"
                value={formData.shop_name}
                onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="VD: admin@thegioididong.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu Khách Víp *</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Tối thiểu 8 ký tự, có đủ Hoa, thường, số, ký tự đặc biệt..."
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Nhập lại mật khẩu *</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Nhập lại mật khẩu..."
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Đang tạo dữ liệu...' : 'Hoàn Tất Đăng Ký'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{marginTop: '24px'}}>
          Đã có tài khoản? 
          <Link to="/login" className="auth-link">Đăng Nhập Ở Đây</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
