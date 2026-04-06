import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiList, FiCamera, FiDollarSign, FiUser, FiZap, FiLogOut } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import './ShipperLayout.css';

const ShipperLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const initials = user?.phone?.slice(-4) || 'SP';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shipper-frame">
      {/* ===== TOP HEADER ===== */}
      <header className="sh-header">
        <div className="sh-header-brand">
          <div className="sh-logo">
            <FiZap size={16} />
          </div>
          <div>
            <span className="sh-app-name">GHST Shipper</span>
            <span className="sh-app-tagline">Giao hàng nhanh</span>
          </div>
        </div>

        <div className="sh-header-right">
          <div className="sh-user-chip">
            <div className="sh-avatar">{initials}</div>
            <div className="sh-user-info">
              <span className="sh-user-phone">{user?.phone || 'Shipper'}</span>
              <span className="sh-user-role">🛵 Bưu tá</span>
            </div>
          </div>
          <button
            className="sh-logout-btn"
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <FiLogOut size={17} />
          </button>
        </div>
      </header>

      {/* ===== SCROLLABLE MAIN CONTENT ===== */}
      <main className="sh-content scroll-y">
        <Outlet />
      </main>

      {/* ===== BOTTOM NAVIGATION (5 tabs) ===== */}
      <nav className="sh-bottom-nav" role="navigation" aria-label="Điều hướng chính">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sh-nav-item${isActive ? ' active' : ''}`}
          aria-label="Tổng quan"
        >
          <FiHome size={21} />
          <span>Tổng Quan</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) => `sh-nav-item${isActive ? ' active' : ''}`}
          aria-label="Lịch trình"
        >
          <FiList size={21} />
          <span>Lịch Trình</span>
        </NavLink>

        {/* CENTER: Camera FAB */}
        <NavLink
          to="/scan"
          className={({ isActive }) => `sh-nav-item sh-scan-center${isActive ? ' active' : ''}`}
          aria-label="Quét mã"
        >
          <div className="sh-scan-fab">
            <FiCamera size={25} />
          </div>
          <span>Quét Mã</span>
        </NavLink>

        <NavLink
          to="/cod"
          className={({ isActive }) => `sh-nav-item${isActive ? ' active' : ''}`}
          aria-label="Đối soát COD"
        >
          <FiDollarSign size={21} />
          <span>Đối Soát</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `sh-nav-item${isActive ? ' active' : ''}`}
          aria-label="Hồ sơ"
        >
          <FiUser size={21} />
          <span>Tôi</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default ShipperLayout;
