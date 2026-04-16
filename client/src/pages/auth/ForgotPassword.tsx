import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUnlock, FiArrowLeft } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Auth.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirm_password: ''
  });
  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      await apiClient.post('/shop/send-otp-forgot', { phone: formData.phone });
      setStep(2);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || !formData.confirm_password) {
      setError('Vui lòng nhập đầy đủ Mật khẩu mới và Nhập lại mật khẩu.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/shop/reset-password', {
        phone: formData.phone,
        otp: otpValue,
        password: formData.password,
        confirm_password: formData.confirm_password
      }) as any;
      
      if (res && res.status === 'success') {
        setSuccess('Đổi mật khẩu thành công! Đang chuyển trang...');
        setTimeout(() => { navigate('/login'); }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể đổi mật khẩu. Xin thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-graphic" style={{background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'}}>
        <div className="auth-graphic-content">
          <div className="truck-icon-wrapper" style={{background: '#e0e7ff', color: '#4f46e5'}}><FiUnlock /></div>
          <h2>Khôi Phục Mật Khẩu</h2>
          <p>Lấy lại quyền truy cập vào tài khoản Quản Lý Kho Vận của bạn.</p>
        </div>
      </div>
      
      <div className="auth-form-container">
        <Link to="/login" className="back-to-home"><FiArrowLeft /> Quay về Đăng Nhập</Link>
        <div className="auth-header" style={{marginBottom: '20px'}}>
          <h1>Quên Mật Khẩu</h1>
          <p>Xác thực số điện thoại - {step === 1 ? 'Bước 1/3' : step === 2 ? 'Bước 2/3' : 'Bước 3/3'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{background: 'var(--success-bg)', color: 'var(--success)'}}>{success}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label>Số điện thoại đã đăng ký *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="VD: 0987654321"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
              />
            </div>
            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Đang kiểm tra...' : 'Gửi mã OTP qua SMS'}
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
                placeholder="Nhập 6 số OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').substring(0, 6))}
                maxLength={6}
              />
            </div>
             <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác nhận OTP'}
            </button>
            <div style={{marginTop: '12px', textAlign: 'center'}}>
              <span style={{color: '#6d28d9', cursor: 'pointer', fontSize: '0.9rem'}} onClick={() => setStep(1)}>
                Nhập sai số điện thoại?
              </span>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Mật khẩu mới *</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Tối thiểu 8 ký tự, có đủ Hoa, thường, số..."
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Nhập lại mật khẩu mới *</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Nhập lại mật khẩu..."
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{marginTop: '24px'}}>
          Chưa có tài khoản? 
          <Link to="/register" className="auth-link">Đăng Ký Khách Mới</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
