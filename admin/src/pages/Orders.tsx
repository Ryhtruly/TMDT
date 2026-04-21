import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiX, FiPackage, FiMapPin, FiClock, FiUser, FiPhone, FiTruck } from 'react-icons/fi';
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

const fmt = (n: any) => parseFloat(n || 0).toLocaleString('vi-VN');
const fmtDate = (d: string) => d ? new Date(d).toLocaleString('vi-VN') : '—';

// === ORDER DETAIL MODAL ===
const OrderDetailModal = ({ trackingCode, onClose }: { trackingCode: string; onClose: () => void }) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get(`/admin/orders/${trackingCode}/detail`).then((res: any) => {
      const payload = res?.data || null;
      const order = payload?.order || payload;
      setDetail(order ? { ...order, logs: payload?.timeline || payload?.logs || [] } : null);
    }).catch((err: any) => {
      setError(err?.response?.data?.message || 'Không tải được chi tiết đơn.');
    }).finally(() => setLoading(false));
  }, [trackingCode]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px',
        maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Chi Tiết Vận Đơn</h2>
            <p style={{ color: 'var(--primary-color)', fontFamily: 'monospace', fontWeight: 700, margin: '4px 0 0' }}>{trackingCode}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Đang tải...</div>}
          {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>{error}</div>}

          {detail && (<>
            {/* Status */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {(() => { const s = statusStyle[detail.status] || { bg: '#f3f4f6', color: '#374151' }; return (
                <span style={{ background: s.bg, color: s.color, padding: '6px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.95rem' }}>
                  {detail.status}
                </span>
              ); })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Sender */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiPackage size={13} /> Thông tin gửi
                </div>
                <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{detail.shop_name || '—'}</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}><FiMapPin size={11} style={{ marginRight: 4 }} />{detail.pickup_address || '—'}</p>
                {detail.sender_phone && <p style={{ fontSize: '0.85rem', color: '#64748b' }}><FiPhone size={11} style={{ marginRight: 4 }} />{detail.sender_phone}</p>}
              </div>

              {/* Receiver */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiUser size={13} /> Người nhận
                </div>
                <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{detail.receiver_name}</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}><FiPhone size={11} style={{ marginRight: 4 }} />{detail.receiver_phone}</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}><FiMapPin size={11} style={{ marginRight: 4 }} />{detail.receiver_address}{detail.district ? `, ${detail.district}` : ''}{detail.province ? `, ${detail.province}` : ''}</p>
              </div>
            </div>

            {/* Fee info */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>CƯỚC PHÍ</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)' }}>{fmt(detail.shipping_fee)}₫</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>COD</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{fmt(detail.cod_amount)}₫</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>KHỐI LƯỢNG</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{detail.weight || detail.weight_g ? `${((detail.weight_g || detail.weight) / 1000).toFixed(2)} kg` : '—'}</div>
              </div>
              {detail.service_name && <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>DỊCH VỤ</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{detail.service_name}</div>
              </div>}
              {detail.shipper_name && <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SHIPPER</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}><FiTruck size={11} style={{ marginRight: 4 }} />{detail.shipper_name}</div>
              </div>}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>NGÀY TẠO</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}><FiClock size={11} style={{ marginRight: 4 }} />{fmtDate(detail.created_at)}</div>
              </div>
            </div>

            {/* Log timeline */}
            {detail.logs && detail.logs.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Lịch sử vận chuyển</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detail.logs.map((log: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 14px', background: i === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${i === 0 ? '#16a34a' : '#e2e8f0'}` }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '120px', flexShrink: 0 }}>{fmtDate(log.created_at)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{log.action}</div>
                        {log.location_name && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{log.location_name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}
        </div>
      </div>
    </div>
  );
};

// === MAIN ORDERS PAGE ===
const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTracking, setSelectedTracking] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize), ...(statusFilter && { status: statusFilter }) });
      const res = await apiClient.get(`/admin/orders?${params}`) as any;
      setOrders(res.rows || []);
      setTotal(res.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = orders.filter(o =>
    o.tracking_code?.includes(search.toUpperCase()) ||
    o.receiver_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.shop_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="orders-page">
      {selectedTracking && <OrderDetailModal trackingCode={selectedTracking} onClose={() => setSelectedTracking(null)} />}

      <div className="page-header">
        <h1 className="page-title">Quản Lý Đơn Hàng — Toàn Hệ Thống</h1>
        <p className="page-subtitle">Theo dõi và tìm kiếm tất cả vận đơn theo thời gian thực.</p>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" className="form-control" placeholder="Tìm mã vận đơn, người nhận, shop..."
              style={{ paddingLeft: '36px' }} value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th style={{ width: '14%' }}>Trạng thái</th>
                  <th style={{ width: '10%' }}>Ngày tạo</th>
                  <th style={{ width: '6%' }} className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const s = statusStyle[o.status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={o.id_order}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.82rem', cursor: 'pointer' }}
                          onClick={() => setSelectedTracking(o.tracking_code)}>
                          {o.tracking_code}
                        </span>
                      </td>
                      <td className="font-medium">{o.shop_name}</td>
                      <td>
                        <div>{o.receiver_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{o.receiver_phone}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(o.shipping_fee)}₫</td>
                      <td style={{ fontWeight: 600, color: '#047857' }}>{fmt(o.cod_amount)}₫</td>
                      <td>
                        <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {new Date(o.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="text-right">
                        <button className="action-btn text-primary" onClick={() => setSelectedTracking(o.tracking_code)}>Xem</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">Không có đơn hàng nào.</td></tr>}
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
