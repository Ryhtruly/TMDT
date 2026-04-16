import { useState, useEffect } from 'react';
import { FiRefreshCcw, FiSearch, FiAlertCircle } from 'react-icons/fi';
import apiClient from '../api/client';


const STATUS_TABS = [
  { label: 'Tất cả', value: '' },
  { label: 'Giao thất bại', value: 'GIAO THẤT BẠI' },
  { label: 'Đang hoàn', value: 'HOÀN HÀNG' },
  { label: 'Tại kho', value: 'TẠI KHO' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'GIAO THẤT BẠI': { bg: '#fee2e2', color: '#b91c1c' },
  'HOÀN HÀNG':     { bg: '#ffedd5', color: '#c2410c' },
  'TẠI KHO':       { bg: '#f1f5f9', color: '#475569' },
};

const money = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
const fmt   = (v: any) => v ? new Date(v).toLocaleString('vi-VN') : '—';

const Returns = () => {
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<any>(null);

  const fetchData = async (status = '') => {
    setLoading(true);
    try {
      const url = status ? `/admin/returns?status=${encodeURIComponent(status)}` : '/admin/returns';
      const res: any = await apiClient.get(url);
      setRows(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(filter); }, [filter]);

  const filtered = rows.filter(r =>
    (r.tracking_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.receiver_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.receiver_phone || '').includes(search) ||
    (r.shop_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 className="page-title">
            <FiRefreshCcw style={{ marginRight: 8, color: 'var(--primary-color)' }} />
            Quản Lý Hoàn Hàng
          </h1>
          <div className="global-search" style={{ width: 280, height: 40 }}>
            <FiSearch color="var(--slate-400)" />
            <input
              type="text"
              placeholder="Tìm mã vận đơn, tên, SĐT, shop..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
          {filtered.length} đơn cần xử lý
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            className={`filter-btn ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <div className="ghn-empty-state">
          <div className="empty-illustration"><div className="big-question">🎉</div></div>
          <p>Không có đơn hoàn hàng nào</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="ghn-table">
            <thead>
              <tr>
                <th>Mã vận đơn</th>
                <th>Shop</th>
                <th>Người nhận</th>
                <th>COD</th>
                <th>Lần giao</th>
                <th>Lý do cuối</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const st = STATUS_STYLE[r.status] || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <tr key={r.id_order} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: 13 }}>{r.tracking_code}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.weight}g</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.shop_name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.store_name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.receiver_name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.receiver_phone}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: r.cod_amount > 0 ? '#059669' : '#9ca3af' }}>
                      {r.cod_amount > 0 ? money(r.cod_amount) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: Number(r.attempt_count) >= 3 ? '#fee2e2' : '#fef3c7',
                        color: Number(r.attempt_count) >= 3 ? '#b91c1c' : '#92400e',
                        padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700
                      }}>
                        {r.attempt_count}/3
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                      {r.last_fail_reason
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FiAlertCircle size={12} color="#ef4444" />
                            {r.last_fail_reason.length > 50 ? r.last_fail_reason.slice(0, 50) + '...' : r.last_fail_reason}
                          </span>
                        : '—'
                      }
                    </td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{fmt(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Chi tiết hoàn hàng</h2>
                <div style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{selected.tracking_code}</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="drawer-body">
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 20 }}>
                {[
                  ['Shop',           selected.shop_name],
                  ['Kho gửi',        selected.store_name],
                  ['Địa chỉ lấy',    selected.pickup_address],
                  ['Hotline kho',     selected.pickup_phone || '—'],
                  ['Người nhận',     selected.receiver_name],
                  ['SĐT nhận',       selected.receiver_phone],
                  ['Địa chỉ giao',   selected.receiver_address],
                  ['COD',            selected.cod_amount > 0 ? money(selected.cod_amount) : 'Không có'],
                  ['Phí ship',       money(selected.shipping_fee)],
                  ['Số lần giao',    `${selected.attempt_count}/3`],
                  ['Giao cuối lúc',  fmt(selected.last_attempt_at)],
                  ['Ngày tạo',       fmt(selected.created_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {selected.last_fail_reason && (
                <div style={{ background: '#fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                    <FiAlertCircle style={{ display: 'inline', marginRight: 4 }} />
                    Lý do giao thất bại lần cuối
                  </div>
                  <div style={{ fontSize: 13, color: '#7f1d1d' }}>{selected.last_fail_reason}</div>
                </div>
              )}

              {selected.note && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Ghi chú đơn hàng</div>
                  <div style={{ fontSize: 13 }}>{selected.note}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
