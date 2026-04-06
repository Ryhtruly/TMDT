import { useState, useEffect } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiBox, FiMapPin, FiLogOut, FiPackage, FiSearch, FiBell, FiShield, FiPlus } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';
import './ShopLayout.css';

const ShopLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [defaultStoreId, setDefaultStoreId] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/shop/stores').then((res: any) => {
        if (res?.status === 'success') {
          setStores(res.data);
          const saved = localStorage.getItem('default_store');
          if (saved && res.data.find((s: any) => String(s.id_store) === saved)) {
            setDefaultStoreId(saved);
          } else if (res.data.length > 0) {
            setDefaultStoreId(String(res.data[0].id_store));
            localStorage.setItem('default_store', String(res.data[0].id_store));
          }
        }
      }).catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDefaultStoreId(val);
    localStorage.setItem('default_store', val);
    window.dispatchEvent(new Event('default_store_changed'));
  };

  // Protect the route
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shop-layout">
      {/* Sidebar */}
      <aside className="shop-sidebar">
        <div className="sidebar-logo">
          <div style={{background: 'white', color: 'var(--primary-color)', padding: '4px', borderRadius: '4px', display: 'flex'}}>
            <FiPackage size={18} />
          </div>
          <h2>Bán Hàng Tốt</h2>
        </div>
        
        <div className="sidebar-user">
          <div className="avatar">
            {user?.phone?.substring(0, 2) || 'SH'}
          </div>
          <div className="user-name">{user?.display_name || user?.phone || 'Chủ cửa hàng'}</div>
          <div className="user-role">Chủ cửa hàng 💰</div>
          <div className="credit-limit">Hạn mức còn lại: 60.000 đ</div>
        </div>

        <div className="verify-card">
          <FiShield size={32} color="var(--primary-color)" style={{marginBottom: '8px'}} />
          <p>Xác thực tài khoản để tận hưởng các quyền lợi đặc biệt từ Hệ thống nhé shop ơi!</p>
          <button className="btn-primary" style={{width: '100%', padding: '8px', fontSize: '12px'}}>Xác thực ngay</button>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
             Báo cáo - Live
          </NavLink>
          <NavLink to="/orders" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
             Quản lý đơn hàng
          </NavLink>
          <NavLink to="/stores" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
             Quản lý cửa hàng
          </NavLink>
          <NavLink to="/wallet" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
             COD & đối soát
          </NavLink>
          <NavLink to="/support" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
             Hỗ trợ - Khiếu nại
          </NavLink>
        </nav>
      </aside>

      {/* Main Column */}
      <main className="shop-main">
        {/* Top Navbar */}
        <header className="shop-topbar">
          <div className="global-search">
            <FiSearch color="var(--slate-400)" size={18} />
            <input type="text" placeholder="Tìm bằng SĐT, Mã đơn, Tên người nhận..." />
            <span className="search-shortcut">⌘ K</span>
          </div>

          <div className="topbar-right">
            <button className="btn-create-order" onClick={() => navigate('/orders/create')}>
              <FiPlus size={18} />
              Tạo đơn hàng
            </button>
            <div className="store-selector" title="Đổi kho lấy hàng">
              <FiMapPin /> 
              <select 
                value={defaultStoreId} 
                onChange={handleStoreChange}
                style={{background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'bold', outline: 'none', appearance: 'none', paddingRight: '12px'}}
              >
                {stores.length === 0 && <option value="">Kho Mặc Định</option>}
                {stores.map(s => (
                  <option key={s.id_store} value={s.id_store} style={{color: 'black'}}>{s.store_name}</option>
                ))}
              </select>
              <span>▾</span>
            </div>
            <button className="tag-btn orange" onClick={() => navigate('/orders/create?type=1')}>
              <FiBox /> Hàng nhẹ &lt; 20kg
            </button>
            <button className="tag-btn" onClick={() => navigate('/orders/create?type=2')}>
              <FiPackage /> Hàng nặng ≥ 20kg
            </button>
            <button className="btn-logout" title="Thông báo">
              <FiBell />
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Đăng xuất">
              <FiLogOut />
            </button>
          </div>
        </header>

        {/* Content Injector */}
        <div className="shop-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ShopLayout;
