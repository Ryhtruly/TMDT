import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBox,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShield,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/client';
import './ShopLayout.css';

const ShopLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [defaultStoreId, setDefaultStoreId] = useState<string>('');
  const [walletInfo, setWalletInfo] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    apiClient
      .get('/shop/stores')
      .then((res: any) => {
        if (res?.status !== 'success') return;
        setStores(res.data);

        const saved = localStorage.getItem('default_store');
        if (saved && res.data.find((s: any) => String(s.id_store) === saved)) {
          setDefaultStoreId(saved);
          return;
        }

        if (res.data.length > 0) {
          const firstStoreId = String(res.data[0].id_store);
          setDefaultStoreId(firstStoreId);
          localStorage.setItem('default_store', firstStoreId);
        }
      })
      .catch((err) => console.error(err));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchWallet = async () => {
      try {
        const res = (await apiClient.get('/shop/wallet')) as any;
        if (res?.status === 'success') {
          setWalletInfo(res.data.wallet);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchWallet();
    window.addEventListener('wallet_updated', fetchWallet);
    return () => window.removeEventListener('wallet_updated', fetchWallet);
  }, [isAuthenticated]);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDefaultStoreId(val);
    localStorage.setItem('default_store', val);
    window.dispatchEvent(new Event('default_store_changed'));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const availableBalance = Number(walletInfo?.available_balance || 0);
  const currentBalance = Number(walletInfo?.balance || 0);

  return (
    <div className="shop-layout">
      <aside className="shop-sidebar">
        <div className="sidebar-logo">
          <div
            style={{
              background: 'white',
              color: 'var(--primary-color)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <FiPackage size={18} />
          </div>
          <h2>Ban Hang Tot</h2>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user?.phone?.substring(0, 2) || 'SH'}</div>
          <div className="user-name">{user?.display_name || user?.phone || 'Chu cua hang'}</div>
          <div className="user-role">Chu cua hang</div>
          <div className="credit-limit">Kha dung tao don: {availableBalance.toLocaleString('vi-VN')} d</div>
          <div className="credit-limit" style={{ fontSize: '12px', opacity: 0.9 }}>
            So du vi: {currentBalance.toLocaleString('vi-VN')} d
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Bao cao - Live
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Quan ly don hang
          </NavLink>
          <NavLink to="/stores" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Quan ly cua hang
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            COD va doi soat
          </NavLink>
          <NavLink to="/support" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Ho tro - Khieu nai
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Cau hinh tai khoan
          </NavLink>
        </nav>
      </aside>

      <main className="shop-main">
        <header className="shop-topbar">
          <div className="global-search">
            <FiSearch color="var(--slate-400)" size={18} />
            <input type="text" placeholder="Tim bang SDT, Ma don, Ten nguoi nhan..." />
            <span className="search-shortcut">Ctrl K</span>
          </div>

          <div className="topbar-right">
            <button className="btn-create-order" onClick={() => navigate('/orders/create')}>
              <FiPlus size={18} />
              Tao don hang
            </button>
            <div className="store-selector" title="Doi kho lay hang">
              <FiMapPin />
              <select
                value={defaultStoreId}
                onChange={handleStoreChange}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontWeight: 'bold',
                  outline: 'none',
                  appearance: 'none',
                  paddingRight: '12px',
                }}
              >
                {stores.length === 0 && <option value="">Kho mac dinh</option>}
                {stores.map((s) => (
                  <option key={s.id_store} value={s.id_store} style={{ color: 'black' }}>
                    {s.store_name}
                  </option>
                ))}
              </select>
              <span>▾</span>
            </div>
            <button className="tag-btn orange" onClick={() => navigate('/orders/create?type=1')}>
              <FiBox /> Hang nhe &lt; 20kg
            </button>
            <button className="tag-btn" onClick={() => navigate('/orders/create?type=2')}>
              <FiPackage /> Hang nang ≥ 20kg
            </button>
            <button className="btn-logout" title="Thong bao">
              <FiBell />
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Dang xuat">
              <FiLogOut />
            </button>
          </div>
        </header>

        <div className="shop-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ShopLayout;
