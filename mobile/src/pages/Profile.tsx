import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPhone, FiLogOut, FiChevronRight,
  FiDollarSign, FiInfo, FiBell, FiShield
} from 'react-icons/fi';
import useAuth from '../hooks/useAuth';
import './Profile.css';

const APP_VERSION = '1.0.0';



const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem('session_start');
    logout();
    navigate('/login');
  };

  const initials = user?.phone?.slice(-4) || 'SP';
  const displayName = user?.display_name || `Shipper ${user?.phone?.slice(-4) || ''}`;

  const menuGroups = [
    {
      title: 'Tài khoản',
      items: [
        {
          icon: <FiDollarSign size={18} />,
          label: 'Thu nhập & Lương',
          sub: 'Xem bảng lương chi tiết',
          color: '#7c3aed',
          bg: '#f5f3ff',
          action: () => navigate('/income'),
          readonly: false,
        },
        {
          icon: <FiShield size={18} />,
          label: 'Khu vực phụ trách',
          sub: 'Chưa phân công',
          color: '#2563eb',
          bg: '#eff6ff',
          action: () => {},
          readonly: true,
        },
      ]
    },
    {
      title: 'Cài đặt',
      items: [
        {
          icon: <FiBell size={18} />,
          label: 'Thông báo',
          sub: notifEnabled ? 'Đang bật' : 'Đang tắt',
          color: '#d97706',
          bg: '#fffbeb',
          action: () => setNotifEnabled(v => !v),
          toggle: notifEnabled,
          readonly: false,
        },
      ]
    },
    {
      title: 'Thông tin',
      items: [
        {
          icon: <FiInfo size={18} />,
          label: 'Phiên bản ứng dụng',
          sub: `GHST Shipper v${APP_VERSION}`,
          color: '#64748b',
          bg: '#f8fafc',
          action: () => {},
          readonly: true,
        },
        {
          icon: <FiShield size={18} />,
          label: 'Chính sách bảo mật',
          sub: 'Xem điều khoản sử dụng',
          color: '#475569',
          bg: '#f8fafc',
          action: () => {},
          readonly: false,
        },
      ]
    }
  ];

  return (
    <div className="profile-page">
      {/* ===== HERO CARD ===== */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-content">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              <span className="profile-avatar-initials">{initials}</span>
            </div>
            {/* Online ring */}
            <div className="profile-online-ring" />
          </div>
          <div className="profile-name">{displayName}</div>
          <div className="profile-role-badge">
            🛵 Bưu tá / Người giao hàng
          </div>
          <div className="profile-info-row">
            {user?.phone && (
              <span className="profile-info-chip">
                <FiPhone size={11} /> {user.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== MENU ===== */}
      <div className="profile-body">
        {menuGroups.map(group => (
          <div key={group.title} className="profile-group">
            <div className="profile-group-title">{group.title}</div>
            <div className="profile-menu-card">
              {group.items.map((item, i) => (
                <div key={i}>
                  {i > 0 && <div className="profile-menu-divider" />}
                  <button
                    className={`profile-menu-item${item.readonly ? ' readonly' : ''}`}
                    onClick={item.action}
                  >
                    <div
                      className="profile-menu-icon"
                      style={{ background: item.bg, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div className="profile-menu-info">
                      <div className="profile-menu-label">{item.label}</div>
                      <div className="profile-menu-sub">{item.sub}</div>
                    </div>
                    {'toggle' in item && item.toggle !== undefined ? (
                      <div className={`profile-toggle${item.toggle ? ' on' : ''}`}>
                        <div className="profile-toggle-knob" />
                      </div>
                    ) : !item.readonly ? (
                      <FiChevronRight size={16} className="profile-menu-arrow" />
                    ) : null}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ===== LOGOUT ===== */}
        {!confirmLogout ? (
          <button
            className="profile-logout-btn"
            onClick={() => setConfirmLogout(true)}
          >
            <FiLogOut size={18} />
            Đăng xuất
          </button>
        ) : (
          <div className="profile-logout-confirm animate-scale-in">
            <p>Bạn chắc chắn muốn đăng xuất?</p>
            <div className="profile-logout-confirm-btns">
              <button className="btn-outline" onClick={() => setConfirmLogout(false)}>
                Hủy
              </button>
              <button className="btn-danger" onClick={handleLogout}>
                <FiLogOut size={15} /> Đăng xuất
              </button>
            </div>
          </div>
        )}

        {/* App version footer */}
        <div className="profile-footer">
          <div className="profile-footer-logo">⚡</div>
          <div className="profile-footer-text">
            GHST Shipper App · v{APP_VERSION}
          </div>
          <div className="profile-footer-sub">Hệ thống quản lý vận chuyển</div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
