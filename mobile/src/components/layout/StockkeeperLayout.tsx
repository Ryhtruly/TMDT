import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiBox, FiDownload, FiUpload, FiUser, FiLogOut } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import './StockkeeperLayout.css';

const StockkeeperLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('session_start');
    logout();
    navigate('/login');
  };

  const displayName = user?.display_name || `Thủ Kho ${user?.phone?.slice(-4) || ''}`;

  return (
    <div className="stock-frame">
      {/* Top Header */}
      <header className="stock-header">
        <div className="stock-header-content">
          <div className="stock-logo-area">
            <div className="stock-logo-icon">⚡</div>
            <div className="stock-logo-text">
              GHST <span className="stock-logo-ghst">KHO</span>
            </div>
          </div>
          
          <div className="stock-user-chip" onClick={handleLogout} title="Đăng xuất">
            <span className="stock-user-name">{displayName}</span>
            <div className="stock-user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <FiLogOut className="stock-logout-icon" size={14} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="stock-main">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="stock-bottom-nav">
        <NavLink to="/stock/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FiBox size={22} />
          <span>Tồn Kho</span>
        </NavLink>
        
        <NavLink to="/stock/inbound" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FiDownload size={22} />
          <span>Nhập Kho</span>
        </NavLink>

        <NavLink to="/stock/outbound" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FiUpload size={22} />
          <span>Xuất Kho</span>
        </NavLink>

        <NavLink to="/stock/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FiUser size={22} />
          <span>Tôi</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default StockkeeperLayout;
