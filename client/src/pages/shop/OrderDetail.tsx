import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiMapPin, FiDollarSign, FiClock, FiRefreshCcw } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Orders.css';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'CHỜ LẤY HÀNG':   { label: 'Chờ lấy hàng',    color: '#b45309', bg: '#fef3c7' },
  'ĐÃ LẤY HÀNG':    { label: 'Đã lấy hàng',     color: '#1d4ed8', bg: '#dbeafe' },
  'ĐANG GIAO':       { label: 'Đang giao',        color: '#7c3aed', bg: '#ede9fe' },
  'GIAO THÀNH CÔNG': { label: 'Giao thành công', color: '#047857', bg: '#d1fae5' },
  'GIAO THẤT BẠI':   { label: 'Giao thất bại',   color: '#b91c1c', bg: '#fee2e2' },
  'HOÀN HÀNG':       { label: 'Hoàn hàng',        color: '#c2410c', bg: '#ffedd5' },
  'ĐÃ HỦY':          { label: 'Đã hủy',           color: '#4b5563', bg: '#f3f4f6' },
  'TẠI KHO':         { label: 'Tại kho',           color: '#64748b', bg: '#f1f5f9' },
};

const money = (v: any) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
const fmt = (v: any) => v ? new Date(v).toLocaleString('vi-VN') : '—';

const InfoRow = ({ label, value }: { label: string; value: any }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
    <span style={{ color: '#6b7280', fontSize: 14 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
  </div>
);

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrder = async () => {
    setLoading(true);
    try {
      // id có thể là tracking_code hoặc id_order — dùng tracking_code
      const res: any = await apiClient.get(`/shop/orders/${encodeURIComponent(String(id))}/track`);
      const data = res?.data;
      setOrder(data?.order || data);
      setTimeline(data?.timeline || data?.logs || []);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Không tìm thấy đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleReturnRequest = async () => {
    if (!order?.id_order) return;
    setReturnLoading(true);
    try {
      const quoteRes: any = await apiClient.get(`/orders/${order.id_order}/return-quote`);
      const quote = quoteRes?.data || {};
      const fee = Number(quote.return_fee || 0);
      const ok = window.confirm(
        `Yeu cau hoan hang don ${order.tracking_code}?\n\n` +
        `Phi hoan hang: ${fee.toLocaleString('vi-VN')}d\n` +
        `Cong thuc: ${quote.formula || '-'}\n` +
        `So du kha dung: ${Number(quote.wallet_available || 0).toLocaleString('vi-VN')}d\n\n` +
        'Phi se duoc tru vao vi/hang muc cua shop. Don se quay ve shop gui.'
      );
      if (!ok) return;

      const res: any = await apiClient.post(`/orders/${order.id_order}/return`);
      alert(res?.message || 'Da gui yeu cau hoan hang.');
      window.dispatchEvent(new Event('wallet_updated'));
      fetchOrder();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Khong the yeu cau hoan hang.');
    } finally {
      setReturnLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải chi tiết đơn...</div>;
  if (error) return (
    <div style={{ padding: 40 }}>
      <button className="btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        <FiArrowLeft /> Quay lại
      </button>
      <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 20, borderRadius: 10 }}>{error}</div>
    </div>
  );
  if (!order) return null;

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#6b7280', bg: '#f3f4f6' };
  const canRequestReturn = ['GIAO THẤT BẠI', 'TẠI KHO'].includes(order.status) && !order.is_return;

  return (
    <div className="orders-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <button className="btn-outline" onClick={() => navigate('/orders')} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiArrowLeft /> Danh sách đơn
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title" style={{ fontSize: 18 }}>{order.tracking_code}</h1>
          <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: statusInfo.color, background: statusInfo.bg }}>
            {statusInfo.label}
          </span>
          {canRequestReturn && (
            <button
              className="btn-outline"
              onClick={handleReturnRequest}
              disabled={returnLoading}
              style={{ borderColor: '#f97316', color: '#c2410c' }}
            >
              <FiRefreshCcw /> {returnLoading ? 'Dang xu ly...' : 'Yeu cau hoan hang'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Thông tin người nhận */}
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiMapPin color="var(--primary-color)" /> Thông tin giao hàng
          </h3>
          <InfoRow label="Người nhận" value={order.receiver_name} />
          <InfoRow label="Số điện thoại" value={order.receiver_phone} />
          <InfoRow label="Địa chỉ giao" value={order.receiver_address} />
          <InfoRow label="Kho gửi" value={order.store_name} />
          <InfoRow label="Địa chỉ lấy hàng" value={order.pickup_address} />
          <InfoRow label="Dịch vụ" value={order.service_name || 'Tiêu chuẩn'} />
          <InfoRow label="Ngày tạo" value={fmt(order.created_at)} />
        </div>

        {/* Thông tin tài chính */}
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiDollarSign color="var(--primary-color)" /> Thông tin tài chính
          </h3>
          <InfoRow label="Trọng lượng" value={`${order.weight}g`} />
          <InfoRow label="Giá trị hàng" value={money(order.item_value)} />
          <InfoRow label="Tiền thu hộ (COD)" value={order.cod_amount > 0 ? money(order.cod_amount) : 'Không có'} />
          <InfoRow label="Phí vận chuyển" value={money(order.shipping_fee)} />
          <InfoRow label="Phí bảo hiểm" value={money(order.insurance_fee)} />
          <InfoRow label="Bên trả phí" value={order.payer_type === 'RECEIVER' ? '👤 Người nhận trả' : '🏪 Shop trả'} />
          <InfoRow label="Hình thức trả phí" value={order.fee_payment_method === 'CASH' ? '💵 Tiền mặt khi lấy hàng' : '💳 Trừ ví'} />
        </div>

        {/* Timeline hành trình */}
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiClock color="var(--primary-color)" /> Hành trình đơn hàng
          </h3>
          {timeline.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Chưa có cập nhật hành trình.</div>
          ) : (
            <div style={{ position: 'relative' }}>
              {timeline.map((log: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 16, marginBottom: idx < timeline.length - 1 ? 24 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      background: idx === timeline.length - 1 ? 'var(--primary-color)' : '#e5e7eb',
                      border: `2px solid ${idx === timeline.length - 1 ? 'var(--primary-color)' : '#d1d5db'}`,
                    }} />
                    {idx < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e7eb', marginTop: 4, minHeight: 20 }} />}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: idx === timeline.length - 1 ? 'var(--primary-color)' : '#374151' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {fmt(log.created_at)}
                      {log.location_name && <span> · <FiPackage style={{ display: 'inline', marginRight: 2 }} />{log.location_name}</span>}
                    </div>
                    {log.evidence_url && (
                      <a href={log.evidence_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary-color)', marginTop: 4, display: 'block' }}>
                        📷 Xem ảnh bằng chứng
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
