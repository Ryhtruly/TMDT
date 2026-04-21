import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBox,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiSearch
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
  const [showDebtNotice, setShowDebtNotice] = useState(false);

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

  useEffect(() => {
    const notice = walletInfo?.debt_notice;
    if (!notice?.should_show) {
      setShowDebtNotice(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `shop_debt_notice_${user?.phone || 'shop'}_${today}`;
    if (!localStorage.getItem(key)) {
      setShowDebtNotice(true);
    }
  }, [walletInfo, user?.phone]);

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

  const handleCloseDebtNotice = () => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `shop_debt_notice_${user?.phone || 'shop'}_${today}`;
    localStorage.setItem(key, '1');
    setShowDebtNotice(false);
  };

  const handleCreateOrderClick = () => {
    if (walletInfo?.debt_notice?.is_locked) {
      alert('Tài khoản đang bị hạn chế do công nợ quá hạn hoặc vượt hạn mức. Vui lòng nạp tiền trước khi tạo đơn mới.');
      navigate('/wallet');
      return;
    }
    navigate('/orders/create');
  };

  const availableBalance = Math.max(0, Number(walletInfo?.available_balance || 0));
  const currentBalance = Number(walletInfo?.balance || 0);
  const usedCredit = Number(walletInfo?.used_credit || 0);
  const debtNotice = walletInfo?.debt_notice;

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
          <h2>Bán Hàng Tốt</h2>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user?.phone?.substring(0, 2) || 'SH'}</div>
          <div className="user-name">{user?.display_name || user?.phone || 'Chủ cửa hàng'}</div>
          <div className="user-role">Chủ cửa hàng</div>
          <div className="credit-limit">Khả dụng tạo đơn: {availableBalance.toLocaleString('vi-VN')} đ</div>
          <div className="credit-limit" style={{ fontSize: '12px', opacity: 0.9 }}>
            Số dư ví: {currentBalance.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Báo cáo - Live
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Quản lý đơn hàng
          </NavLink>
          <NavLink to="/stores" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Quản lý cửa hàng
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            COD và đối soát
          </NavLink>
          <NavLink to="/support" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Hỗ trợ - Khiếu nại
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Cấu hình tài khoản
          </NavLink>
        </nav>
      </aside>

      <main className="shop-main">
        <header className="shop-topbar">
          <div className="global-search">
            <FiSearch color="var(--slate-400)" size={18} />
            <input type="text" placeholder="Tìm bằng SĐT, Mã đơn, Tên người nhận..." />
            <span className="search-shortcut">Ctrl K</span>
          </div>

          <div className="topbar-right">
            <button className="btn-create-order" onClick={handleCreateOrderClick}>
              <FiPlus /> Tạo đơn hàng
            </button>
            <div className="store-selector" title="Đổi kho lấy hàng">
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
                {stores.length === 0 && <option value="">Kho mặc định</option>}
                {stores.map((s) => (
                  <option key={s.id_store} value={s.id_store} style={{ color: 'black' }}>
                    {s.store_name}
                  </option>
                ))}
              </select>
              <span>▾</span>
            </div>
            <div className="quick-stats">
              <span className="stat-pill success" onClick={() => navigate('/orders/create?type=1')}>
                <FiPackage size={14} /> Hàng nhẹ &lt; 20kg
              </span>
              <span className="stat-pill warning" onClick={() => navigate('/orders/create?type=2')}>
                <FiBox size={14} /> Hàng nặng &ge; 20kg
              </span>
            </div>
            <button className="btn-logout" title="Thông báo">
              <FiBell />
            </button>
            <button className="btn-logout" onClick={handleLogout} title="Đăng xuất">
              <FiLogOut />
            </button>
          </div>
        </header>

        <div className="shop-content">
          <Outlet />
        </div>

        {showDebtNotice && debtNotice?.should_show && (
          <div
            className="modal-overlay"
            onClick={handleCloseDebtNotice}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.48)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(460px, 100%)',
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 18px 60px rgba(15, 23, 42, 0.24)',
                padding: 24,
                color: '#0f172a',
              }}
            >
              <h3 style={{ margin: '0 0 10px', fontSize: 20 }}>
                {debtNotice.is_locked ? 'Tài khoản đang bị hạn chế' : 'Nhắc thanh toán công nợ'}
              </h3>
              <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.55 }}>
                {debtNotice.message}
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Số nợ hiện tại</span>
                  <strong>{usedCredit.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Hạn mức nợ</span>
                  <strong>{Number(walletInfo?.credit_limit || 0).toLocaleString('vi-VN')} đ</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Còn lại</span>
                  <strong>
                    {debtNotice.is_locked
                      ? 'Đã quá hạn/hạn mức'
                      : `${Number(debtNotice.debt_days_until_due || 0).toLocaleString('vi-VN')} ngày`}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={handleCloseDebtNotice}>
                  Để sau
                </button>
                <button
                  type="button"
                  className="btn-create-order"
                  onClick={() => {
                    handleCloseDebtNotice();
                    navigate('/wallet');
                  }}
                >
                  Nạp tiền ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopLayout;
