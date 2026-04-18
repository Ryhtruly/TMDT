import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTruck, FiArrowLeft } from 'react-icons/fi';
import apiClient from '../../api/client';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../../utils/phone';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    shop_name: '',
    tax_code: '',
    representative: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.password || !formData.shop_name || !formData.representative) {
      setError('Vui lòng nhập đầy đủ Số điện thoại, Mật khẩu, Tên Shop và Người đại diện.');
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
      // Gọi API đăng ký
      const res = await apiClient.post('/shop/register', { ...formData, phone: normalizedPhone }) as any;
      
      if (res && res.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
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
          <p>Mở tài khoản Chủ Cửa Hàng miễn phí</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{background: 'var(--success-bg)', color: 'var(--success)'}}>Đăng ký thành công! Đang chuyển hướng...</div>}

        <form onSubmit={handleRegister}>
          <div style={{display: 'flex', gap: '15px'}}>
             <div className="form-group" style={{flex: 1}}>
                <label>Tên Cửa Hàng *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="VD: Hải Sản ĐN"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                />
             </div>
             <div className="form-group" style={{flex: 1}}>
                <label>Người Đại Diện *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Họ Tên..."
                  value={formData.representative}
                  onChange={(e) => setFormData({...formData, representative: e.target.value})}
                />
             </div>
          </div>

          <div className="form-group">
            <label>Mã Số Thuế (Tùy chọn)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nhập mã số thuế..."
              value={formData.tax_code}
              onChange={(e) => setFormData({...formData, tax_code: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại Đăng Nhập *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="VD: 0987654321"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu Khách Víp *</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Tối thiểu 8 ký tự, chữ hoa, số..."
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Tạo Tài Khoản Ngay'}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản? 
          <Link to="/login" className="auth-link">Đăng Nhập Ở Đây</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
