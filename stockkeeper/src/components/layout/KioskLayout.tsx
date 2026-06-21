import React from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiLogOut, FiBox, FiUpload, FiDownload, FiLayers, FiTruck } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import './KioskLayout.css';

const KioskLayout = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div>Dang tai thong tin xac thuc...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    if (window.confirm('Xac nhan dang xuat?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="kiosk-app">
      <nav className="kiosk-sidebar">
        <div className="kiosk-brand">
          <FiBox size={28} />
          <span>He Thong Kho</span>
        </div>

        <div className="kiosk-user">
          <p>Thu Kho: <strong>{user?.display_name || user?.phone}</strong></p>
        </div>

        <div className="kiosk-menu">
          <NavLink to="/inbound" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <FiDownload size={22} /> Nhap Kho (Inbound)
          </NavLink>
          <NavLink to="/outbound" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <FiUpload size={22} /> Xuat Kho (Outbound)
          </NavLink>
          <NavLink to="/bagging" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <FiLayers size={22} /> Gom Bao Kien
          </NavLink>
          <NavLink to="/inventory" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <FiBox size={22} /> Ton Kho Hien Tai
          </NavLink>
          <NavLink to="/transit" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
            <FiTruck size={22} /> Dang Trung Chuyen
          </NavLink>
        </div>

        <div style={{ flex: 1 }} />

        <button className="menu-item logout-btn" onClick={handleLogout}>
          <FiLogOut size={22} />
          Dang Xuat
        </button>
      </nav>

      <main className="kiosk-main">
        <Outlet />
      </main>
    </div>
  );
};

export default KioskLayout;
