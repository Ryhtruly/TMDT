import { useState, useEffect } from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';
import apiClient from '../api/client';

const STATUS_OPTIONS = ['', 'CHỜ LẤY HÀNG', 'ĐANG LẤY', 'ĐANG GIAO', 'GIAO THÀNH CÔNG', 'GIAO THẤT BẠI', 'HOÀN HÀNG', 'ĐÃ HỦY'];

const statusStyle: Record<string, { bg: string; color: string }> = {
  'CHỜ LẤY HÀNG':     { bg: '#dbeafe', color: '#1d4ed8' },
  'ĐANG LẤY':         { bg: '#ede9fe', color: '#6d28d9' },
  'ĐANG GIAO':        { bg: '#fff7ed', color: '#c2410c' },
  'GIAO THÀNH CÔNG':  { bg: '#d1fae5', color: '#047857' },
  'GIAO THẤT BẠI':    { bg: '#fee2e2', color: '#b91c1c' },
  'HOÀN HÀNG':        { bg: '#fef9c3', color: '#854d0e' },
  'ĐÃ HỦY':           { bg: '#f3f4f6', color: '#6b7280' },
};

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(statusFilter && { status: statusFilter })
      });
      const res = await apiClient.get(`/admin/orders?${params}`);
      setOrders(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter(o =>
    o.tracking_code?.includes(search.toUpperCase()) ||
    o.receiver_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.shop_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1 className="page-title">Quản Lý Đơn Hàng — Toàn Hệ Thống</h1>
        <p className="page-subtitle">Theo dõi và tìm kiếm tất cả vận đơn theo thời gian thực.</p>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" className="form-control" placeholder="Tìm mã vận đơn, người nhận, shop..."
              style={{ paddingLeft: '36px' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiFilter style={{ color: '#9ca3af' }} />
            <select className="form-control" style={{ padding: '10px 12px', width: '200px' }}
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Tất cả trạng thái'}</option>)}
            </select>
          </div>
          <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Tổng: {total.toLocaleString()} đơn</span>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Đang tải dữ liệu đơn hàng...</div> : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Mã vận đơn</th>
                  <th style={{ width: '18%' }}>Shop</th>
                  <th style={{ width: '18%' }}>Người nhận</th>
                  <th style={{ width: '10%' }}>Cước phí</th>
                  <th style={{ width: '10%' }}>COD</th>
                  <th style={{ width: '18%' }}>Trạng thái</th>
                  <th style={{ width: '12%' }}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const s = statusStyle[o.status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={o.id_order}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.85rem' }}>
                          {o.tracking_code}
                        </span>
                      </td>
                      <td className="font-medium">{o.shop_name}</td>
                      <td>
                        <div>{o.receiver_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{o.receiver_phone}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{parseFloat(o.shipping_fee || 0).toLocaleString()}₫</td>
                      <td style={{ fontWeight: 600, color: '#047857' }}>{parseFloat(o.cod_amount || 0).toLocaleString()}₫</td>
                      <td>
                        <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {new Date(o.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">Không có đơn hàng nào.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', alignItems: 'center' }}>
            <button className="action-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
            <span style={{ color: '#374151', fontWeight: 600 }}>Trang {page} / {totalPages}</span>
            <button className="action-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
