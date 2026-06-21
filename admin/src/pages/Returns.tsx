import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPackage,
  FiRefreshCcw,
  FiSearch,
  FiTruck,
  FiX,
} from 'react-icons/fi';
import apiClient from '../api/client';

type ReturnStage = 'ALL' | 'FAILED' | 'RETURNING' | 'READY_TO_RETURN' | 'COMPLETED';

const STAGE_TABS: Array<{ value: ReturnStage; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'FAILED', label: 'Cần quyết định' },
  { value: 'RETURNING', label: 'Đang hoàn' },
  { value: 'READY_TO_RETURN', label: 'Chờ trả shop' },
  { value: 'COMPLETED', label: 'Đã trả shop' },
];

const stageLabel: Record<string, string> = {
  FAILED: 'Cần quyết định',
  RETURNING: 'Đang hoàn',
  READY_TO_RETURN: 'Chờ trả shop',
  COMPLETED: 'Đã trả shop',
  OTHER: 'Theo dõi',
};

const stageTone: Record<string, { bg: string; color: string; border: string }> = {
  FAILED: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  RETURNING: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  READY_TO_RETURN: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  COMPLETED: { bg: '#dcfce7', color: '#047857', border: '#bbf7d0' },
  OTHER: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};

const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const dateTime = (value: any) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const Returns = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeStage, setActiveStage] = useState<ReturnStage>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res: any = await apiClient.get('/admin/returns');
      setRows(res?.data?.rows || []);
      setSummary(res?.data?.summary || {});
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Không tải được danh sách hoàn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const openDetail = async (row: any) => {
    setSelected(row);
    setTimeline([]);
    try {
      const res: any = await apiClient.get(`/admin/returns/${row.id_order}/timeline`);
      setTimeline(res?.data || []);
    } catch {
      setTimeline([]);
    }
  };

  const completeReturn = async () => {
    if (!selected) return;
    if (!window.confirm(`Xác nhận đã trả đơn ${selected.tracking_code} về shop?`)) return;

    setActionLoading(true);
    try {
      await apiClient.post(`/admin/returns/${selected.id_order}/complete`);
      await fetchReturns();
      setSelected(null);
      setTimeline([]);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Không thể xác nhận trả shop.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = activeStage === 'ALL' || row.return_stage === activeStage;
      if (!matchesStage) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        row.tracking_code,
        row.receiver_name,
        row.receiver_phone,
        row.receiver_address,
        row.shop_name,
        row.store_name,
        row.pickup_phone,
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [activeStage, rows, search]);

  const needsHandling = Number(summary.failed || 0) + Number(summary.returning || 0) + Number(summary.returned || 0);

  return (
    <div className="orders-page">
      <div className="page-header d-flex justify-between" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiRefreshCcw color="var(--primary-color)" />
            Quản lý hoàn hàng
          </h1>
          <p className="page-subtitle">Theo dõi đơn giao thất bại, đang hoàn về kho và xác nhận trả lại shop.</p>
        </div>
        <button className="btn-outline" onClick={fetchReturns} disabled={loading}>
          <FiRefreshCcw /> Làm mới
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Cần xử lý</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}><FiAlertCircle /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{needsHandling}</div>
            <p className="stat-desc">đơn chưa hoàn tất</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Đang hoàn</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}><FiTruck /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{Number(summary.returning || 0)}</div>
            <p className="stat-desc">đang trên tuyến hoàn</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Chờ trả shop</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}><FiPackage /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{Number(summary.returned || 0)}</div>
            <p className="stat-desc">đã về điểm trả</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Phí hoàn</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#dcfce7', color: '#047857' }}><FiCheckCircle /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value" style={{ fontSize: 22 }}>{money(summary.return_fee_total)}</div>
            <p className="stat-desc">{Number(summary.completed || 0)} đơn đã trả shop</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            {STAGE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveStage(tab.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: activeStage === tab.value ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                  background: activeStage === tab.value ? 'var(--primary-color)' : '#fff',
                  color: activeStage === tab.value ? '#fff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm mã vận đơn, shop, người nhận, SĐT..."
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Tổng: {filteredRows.length} đơn</span>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">Đang tải dữ liệu hoàn hàng...</div>
          ) : errorMsg ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FiAlertCircle size={40} color="#ef4444" />
              <p style={{ color: '#ef4444', fontWeight: 600, marginTop: 12 }}>{errorMsg}</p>
              <button className="action-btn" onClick={fetchReturns} style={{ marginTop: 8 }}>Thử lại</button>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Mã vận đơn</th>
                  <th style={{ width: '14%' }}>Shop</th>
                  <th style={{ width: '14%' }}>Người nhận</th>
                  <th style={{ width: '10%' }}>Cước phí</th>
                  <th style={{ width: '8%' }}>COD</th>
                  <th style={{ width: '14%' }}>Trạng thái</th>
                  <th style={{ width: '10%' }}>Ngày tạo</th>
                  <th style={{ width: '6%' }} className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={8} className="empty-state">Không có đơn hoàn hàng nào.</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const tone = stageTone[row.return_stage] || stageTone.OTHER;
                    return (
                      <tr key={row.id_order}>
                        <td>
                          <span
                            style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.82rem', cursor: 'pointer' }}
                            onClick={() => openDetail(row)}
                          >
                            {row.tracking_code}
                          </span>
                        </td>
                        <td className="font-medium">{row.shop_name || '-'}</td>
                        <td>
                          <div>{row.receiver_name || '-'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{row.receiver_phone || '-'}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{Number(row.shipping_fee || 0).toLocaleString('vi-VN')}₫</td>
                        <td style={{ fontWeight: 600, color: '#047857' }}>{Number(row.cod_amount || 0).toLocaleString('vi-VN')}₫</td>
                        <td>
                          <span style={{
                            backgroundColor: tone.bg,
                            color: tone.color,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}>
                            {stageLabel[row.return_stage] || row.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {new Date(row.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="text-right">
                          <button className="action-btn text-primary" onClick={() => openDetail(row)}>Xem</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '720px',
            maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Chi Tiết Hoàn Hàng</h2>
                <p style={{ color: 'var(--primary-color)', fontFamily: 'monospace', fontWeight: 700, margin: '4px 0 0' }}>{selected.tracking_code}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <FiX size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Status badge */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {(() => { const tone = stageTone[selected.return_stage] || stageTone.OTHER; return (
                  <span style={{ background: tone.bg, color: tone.color, padding: '6px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.95rem' }}>
                    {stageLabel[selected.return_stage] || selected.status}
                  </span>
                ); })()}
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Shop */}
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiPackage size={13} /> Shop gửi
                  </div>
                  <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{selected.shop_name || '—'}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Kho: {selected.store_name || '—'}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>SĐT: {selected.pickup_phone || selected.shop_phone || '—'}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{selected.pickup_address || '—'}</p>
                </div>

                {/* Receiver */}
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMapPin size={13} /> Người nhận
                  </div>
                  <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{selected.receiver_name || '—'}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>SĐT: {selected.receiver_phone || '—'}</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{selected.receiver_address || '—'}{selected.district ? `, ${selected.district}` : ''}{selected.province ? `, ${selected.province}` : ''}</p>
                </div>
              </div>

              {/* Fee info */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>CƯỚC PHÍ</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)' }}>{Number(selected.shipping_fee || 0).toLocaleString('vi-VN')}₫</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>COD</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{Number(selected.cod_amount || 0).toLocaleString('vi-VN')}₫</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>PHÍ HOÀN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c2410c' }}>{Number(selected.return_fee || 0).toLocaleString('vi-VN')}₫</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>KHỐI LƯỢNG</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{selected.weight ? `${(selected.weight / 1000).toFixed(2)} kg` : '—'}</div>
                </div>
              </div>

              {/* Fail reason */}
              {selected.last_fail_reason && (
                <div style={{ background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', marginTop: '16px' }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><FiAlertCircle size={14} /> Lý do giao thất bại</div>
                  <div style={{ fontSize: '0.9rem' }}>{selected.last_fail_reason}</div>
                  {selected.last_fail_code && <div style={{ marginTop: '4px', fontSize: '0.78rem' }}>Mã lý do: {selected.last_fail_code}</div>}
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Lịch sử vận hành</div>
                {timeline.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '16px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center' }}>Chưa có log vận hành.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {timeline.map((item, i) => (
                      <div key={item.id_log} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 14px', background: i === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${i === 0 ? '#16a34a' : '#e2e8f0'}` }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '120px', flexShrink: 0 }}><FiClock size={11} style={{ marginRight: 4 }} />{dateTime(item.created_at)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{item.action}</div>
                          {item.location_name && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.location_name}{item.actor_name ? ` — ${item.actor_name}` : ''}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setSelected(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Đóng</button>
                {selected.return_stage === 'READY_TO_RETURN' && (
                  <button onClick={completeReturn} disabled={actionLoading} style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                    <FiCheckCircle size={14} style={{ marginRight: 4 }} /> {actionLoading ? 'Đang xác nhận...' : 'Xác nhận đã trả shop'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value, strong = false }: { label: string; value: any; strong?: boolean }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: strong ? 900 : 600, lineHeight: 1.4 }}>{value}</div>
  </div>
);

export default Returns;
