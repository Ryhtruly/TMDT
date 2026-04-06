import { NavLink } from 'react-router-dom';
import { FiHome, FiMap, FiUsers, FiSettings, FiGift, FiMessageSquare, FiActivity, FiBox, FiDollarSign, FiShoppingBag, FiPackage, FiNavigation } from 'react-icons/fi';
import './Layout.css';

const Sidebar = () => {
  const menuGroups = [
    {
      label: 'Tổng quan',
      items: [
        { name: 'Dashboard', path: '/', icon: <FiHome /> },
      ]
    },
    {
      label: 'Vận hành',
      items: [
        { name: 'Đơn Hàng', path: '/orders', icon: <FiPackage /> },
        { name: 'Bao Kiện', path: '/bags', icon: <FiBox /> },
        { name: 'Tuyến Đường', path: '/routes', icon: <FiNavigation /> },
      ]
    },
    {
      label: 'Mạng lưới & Nhân sự',
      items: [
        { name: 'Hạ Tầng Mạng Lưới', path: '/infrastructure', icon: <FiMap /> },
        { name: 'Quản lý Nhân Sự', path: '/employees', icon: <FiUsers /> },
        { name: 'Đối Tác (Shops)', path: '/shops', icon: <FiShoppingBag /> },
      ]
    },
    {
      label: 'Tài chính',
      items: [
        { name: 'Đối Soát COD', path: '/payouts', icon: <FiDollarSign /> },
        { name: 'Khuyến Mãi', path: '/promotions', icon: <FiGift /> },
      ]
    },
    {
      label: 'Hệ thống',
      items: [
        { name: 'CSKH & Sự Cố', path: '/support', icon: <FiMessageSquare /> },
        { name: 'Kiểm Toán & Lương', path: '/audit-salary', icon: <FiActivity /> },
        { name: 'Cấu Hình', path: '/settings', icon: <FiSettings /> },
      ]
    }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <h2 className="text-primary" style={{ fontWeight: 800, fontSize: '1.3rem' }}>⚡ GHN ADMIN</h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--slate-500)', marginTop: '2px' }}>Logistics Management System</p>
      </div>

      <nav className="sidebar-nav">
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 16px 4px' }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
