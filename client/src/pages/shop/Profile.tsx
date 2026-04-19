import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.display_name || '',
    phone: user?.phone || '',
    email: '',
    cccd: '',
    shopName: 'Cửa hàng mặc định',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // In a real implementation, we would fetch profile from /shop/profile
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      alert('Đã lưu thông tin cấu hình tài khoản!');
      setIsEditing(false);
    }, 500);
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Cấu Hình Trang Cá Nhân</h1>
        <p>Quản lý thông tin định danh và tài khoản cửa hàng của bạn.</p>
      </div>

      <div className="profile-container">
        <form onSubmit={handleSave} className="profile-form">
          <div className="form-section">
            <h2 className="section-title">Thông tin chủ tài khoản (KYC)</h2>
            <div className="form-group row-group">
              <div className="input-col">
                <label>Họ và Tên chủ shop</label>
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Nhập họ và tên..."
                />
              </div>
              <div className="input-col">
                <label>Số điện thoại</label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  disabled
                  title="Số điện thoại dùng để đăng nhập rên hệ thống, không thể đổi"
                />
              </div>
            </div>
            
            <div className="form-group row-group">
              <div className="input-col">
                <label>Email liên hệ</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="mail@example.com"
                />
              </div>
              <div className="input-col">
                <label>Số CCCD / CMND</label>
                <input
                  name="cccd"
                  type="text"
                  value={formData.cccd}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Nhập 12 số CCCD"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Thông tin cửa hàng</h2>
            <div className="form-group">
              <label>Tên cửa hàng chính</label>
              <input
                name="shopName"
                type="text"
                value={formData.shopName}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="form-actions">
            {isEditing ? (
              <>
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  Lưu Thay Đổi
                </button>
              </>
            ) : (
              <button type="button" className="btn-edit" onClick={() => setIsEditing(true)}>
                Chỉnh Sửa Thông Tin
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
