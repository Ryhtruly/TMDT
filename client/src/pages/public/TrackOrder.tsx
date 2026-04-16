import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
  'CHỜ LẤY HÀNG':    { label: 'Chờ lấy hàng',    color: '#f59e0b', emoji: '📦' },
  'ĐÃ LẤY HÀNG':     { label: 'Đã lấy hàng',     color: '#3b82f6', emoji: '🚚' },
  'ĐANG GIAO':        { label: 'Đang giao',        color: '#8b5cf6', emoji: '🛵' },
  'GIAO THÀNH CÔNG':  { label: 'Giao thành công', color: '#10b981', emoji: '✅' },
  'GIAO THẤT BẠI':    { label: 'Giao thất bại',   color: '#ef4444', emoji: '❌' },
  'HOÀN HÀNG':        { label: 'Hoàn hàng',        color: '#f97316', emoji: '🔄' },
  'ĐÃ HỦY':           { label: 'Đã hủy',           color: '#6b7280', emoji: '🚫' },
  'TẠI KHO':          { label: 'Tại kho',           color: '#64748b', emoji: '🏭' },
};

const fmt = (v: any) => v ? new Date(v).toLocaleString('vi-VN') : '-';
const money = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;

const TrackOrder = () => {
  const { code: urlCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState(urlCode || '');
  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setLogs([]);
    try {
      const res = await axios.get(`${BASE_URL}/shop/orders/${encodeURIComponent(trackingCode.trim())}/track`);
      const data = res.data?.data || res.data;
      setOrder(data);
      setLogs(data?.logs || []);
      navigate(`/track/${encodeURIComponent(trackingCode.trim())}`, { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Không tìm thấy vận đơn. Vui lòng kiểm tra lại mã.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlCode) search(urlCode);
  }, []);

  const statusInfo = order ? (STATUS_MAP[order.status] || { label: order.status, color: '#6b7280', emoji: '📋' }) : null;

  return (
    <div style={{ minHeight: '80vh', padding: '40px 20px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-color, #F26522)' }}>
          🔍 Tra Cứu Vận Đơn
        </h1>
        <p style={{ color: '#6b7280', marginTop: 8 }}>Nhập mã vận đơn để xem hành trình giao hàng</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input
          type="text"
          className="form-control"
          placeholder="Nhập mã vận đơn, VD: QLKV1234567890"
          value={inputCode}
          onChange={e => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && search(inputCode)}
          style={{ flex: 1, fontSize: 16, padding: '12px 16px', borderRadius: 10, border: '2px solid #e5e7eb' }}
        />
        <button
          className="btn-primary"
          onClick={() => search(inputCode)}
          disabled={loading}
          style={{ padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 16 }}
        >
          {loading ? 'Đang tìm...' : 'Tra cứu'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '14px 20px', borderRadius: 10, marginBottom: 24, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {order && statusInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header card */}
          <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `2px solid ${statusInfo.color}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{order.tracking_code}</div>
                <div style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>Tạo lúc: {fmt(order.created_at)}</div>
              </div>
              <div style={{ background: `${statusInfo.color}18`, color: statusInfo.color, padding: '8px 18px', borderRadius: 50, fontWeight: 700, fontSize: 15 }}>
                {statusInfo.emoji} {statusInfo.label}
              </div>
            </div>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #f3f4f6' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 14 }}>
              <div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 2 }}>Người nhận</div>
                <div style={{ fontWeight: 700 }}>{order.receiver_name}</div>
                <div style={{ color: '#6b7280' }}>{order.receiver_phone}</div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 2 }}>Địa chỉ giao</div>
                <div style={{ fontWeight: 600 }}>{order.receiver_address}</div>
              </div>
              {order.cod_amount > 0 && (
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 2 }}>Tiền thu hộ (COD)</div>
                  <div style={{ fontWeight: 700, color: '#059669' }}>{money(order.cod_amount)}</div>
                </div>
              )}
              <div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 2 }}>Phí vận chuyển</div>
                <div style={{ fontWeight: 600 }}>{money(order.shipping_fee)}</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {logs.length > 0 && (
            <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>🗓 Hành trình vận đơn</h3>
              <div style={{ position: 'relative' }}>
                {logs.map((log: any, idx: number) => (
                  <div key={log.id_log || idx} style={{ display: 'flex', gap: 16, marginBottom: idx < logs.length - 1 ? 20 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: idx === 0 ? 'var(--primary-color, #F26522)' : '#d1d5db',
                        border: `2px solid ${idx === 0 ? 'var(--primary-color, #F26522)' : '#e5e7eb'}`,
                        flexShrink: 0, marginTop: 3
                      }} />
                      {idx < logs.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e7eb', marginTop: 4 }} />}
                    </div>
                    <div style={{ fontSize: 14, paddingBottom: 4 }}>
                      <div style={{ fontWeight: 600, color: idx === 0 ? 'var(--primary-color, #F26522)' : '#374151' }}>
                        {log.action || log.note}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                        {fmt(log.created_at)} {log.location_name && `· ${log.location_name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackOrder;
