import { useState, useEffect } from 'react';
import { FiShoppingBag, FiSearch, FiDollarSign, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import apiClient from '../api/client';

const Shops = () => {
  const [shops, setShops] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    const s = searchText.toLowerCase();
    setFiltered(shops.filter(sh =>
      sh.shop_name?.toLowerCase().includes(s) ||
      sh.phone?.includes(s) ||
      sh.representative?.toLowerCase().includes(s) ||
      sh.tax_code?.includes(s)
    ));
  }, [searchText, shops]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/shops');
      setShops(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = shops.reduce((sum, s) => sum + parseFloat(s.wallet_balance || 0), 0);
  const totalOrders = shops.reduce((sum, s) => sum + parseInt(s.total_orders || 0), 0);

  return (
    <div className="shops-page">
      <div className="page-header">
        <h1 className="page-title">Quản Lý Đối Tác (Shops)</h1>
        <p className="page-subtitle">Xem danh sách và theo dõi hoạt động của tất cả đối tác kinh doanh.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tổng Đối tác</h3>
            <div className="stat-icon-soft"><FiShoppingBag /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{shops.length}</div>
            <p className="stat-desc">{shops.filter(s => s.is_active).length} đang hoạt động</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tổng Ví Tiền</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#d1fae5', color: '#047857' }}><FiDollarSign /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{totalBalance.toLocaleString('vi-VN')}₫</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tổng Đơn Hàng</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}><FiShoppingBag /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{totalOrders.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" className="form-control" placeholder="Tìm tên shop, SĐT, người đại diện..."
              style={{ paddingLeft: '36px' }}
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{filtered.length}/{shops.length} đối tác</span>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Đang tải danh sách đối tác...</div> : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>ID</th>
                  <th style={{ width: '22%' }}>Tên Shop</th>
                  <th style={{ width: '18%' }}>Đại diện / MST</th>
                  <th style={{ width: '15%' }}>SĐT Đăng nhập</th>
                  <th style={{ width: '15%' }}>Số dư Ví</th>
                  <th style={{ width: '10%' }}>Đơn hàng</th>
                  <th style={{ width: '13%' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(shop => (
                  <tr key={shop.id_shop}>
                    <td><span className="badge-id">SH-{shop.id_shop}</span></td>
                    <td>
                      <div className="font-medium">{shop.shop_name}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{shop.representative || '—'}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{shop.tax_code || 'Chưa có MST'}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{shop.phone}</td>
                    <td style={{ fontWeight: 700, color: parseFloat(shop.wallet_balance) > 0 ? '#047857' : '#6b7280' }}>
                      {parseFloat(shop.wallet_balance || 0).toLocaleString('vi-VN')}₫
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {parseInt(shop.total_orders || 0).toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, width: 'fit-content',
                        backgroundColor: shop.is_active ? '#d1fae5' : '#fee2e2',
                        color: shop.is_active ? '#047857' : '#b91c1c'
                      }}>
                        {shop.is_active ? <><FiCheckCircle />Hoạt động</> : <><FiXCircle />Đã khóa</>}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">Chưa có đối tác nào.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shops;
