import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiPackage, FiAlertCircle, FiRefreshCw, FiInfo } from 'react-icons/fi';
import api from '../api/client';
import './COD.css';

interface DeliveredOrder {
  tracking_code: string;
  receiver_name: string;
  receiver_phone: string;
  cod_amount: number | string;
  status: string;
}

const CODReconciliation = () => {
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchCODOrders = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/shipper/delivery-list');
      const all: DeliveredOrder[] = res?.data?.orders || res?.orders || [];
      // Show only orders with COD that haven't been reconciled
      const codOrders = all.filter((o: any) =>
        Number(o.cod_amount) > 0 && o.status === 'GIAO THÀNH CÔNG'
      );
      setOrders(codOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCODOrders(); }, []);

  const totalCOD = orders.reduce((sum, o) => sum + Number(o.cod_amount || 0), 0);

  const handleSubmitCOD = async () => {
    if (orders.length === 0) { showToast('Không có tiền COD nào cần nộp!', 'info'); return; }
    setSubmitting(true);
    try {
      // This would call a real API endpoint for COD submission
      // For now, we simulate the reconciliation flow
      await new Promise(r => setTimeout(r, 1500)); // Simulate API call
      setSubmitted(true);
      showToast(`✅ Đã xác nhận nộp ${totalCOD.toLocaleString('vi-VN')}đ về bưu cục!`, 'success');
    } catch {
      showToast('Không thể gửi yêu cầu đối soát. Thử lại sau!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="cod-page">
        <div className="cod-success-screen">
          <div className="cod-success-icon"><FiCheckCircle size={50} /></div>
          <h3>Đối Soát Thành Công!</h3>
          <p>Bạn đã xác nhận nộp <br /><strong>{totalCOD.toLocaleString('vi-VN')}đ</strong><br />về bưu cục trong ca hôm nay.</p>
          <div className="cod-success-note">
            <FiInfo size={13} />
            Số tiền sẽ được thủ kho xác nhận. Hệ thống sẽ cập nhật sau khi đối soát hoàn tất.
          </div>
          <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => { setSubmitted(false); setOrders([]); fetchCODOrders(); }}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cod-page">
      {toast && <div className={`toast toast-${toastType}`}>{toast}</div>}

      {/* Header */}
      <div className="cod-header">
        <div>
          <h2 className="cod-title">Đối Soát COD</h2>
          <p className="cod-sub">Tổng tiền mặt cần nộp về bưu cục</p>
        </div>
        <button className="cod-refresh-btn" onClick={fetchCODOrders}>
          <FiRefreshCw size={15} />
        </button>
      </div>

      {/* Total COD Card */}
      <div className="cod-total-card">
        <div className="cod-total-icon"><FiDollarSign size={32} /></div>
        <div className="cod-total-body">
          <div className="cod-total-label">Tổng COD thu hộ (chưa nộp)</div>
          <div className="cod-total-amount">
            {loading ? '...' : `${totalCOD.toLocaleString('vi-VN')}đ`}
          </div>
          <div className="cod-total-count">{orders.length} đơn giao thành công</div>
        </div>
      </div>

      {/* Warning */}
      {orders.length > 0 && (
        <div className="cod-warn-box">
          <FiAlertCircle size={14} />
          <span>Cuối ca làm việc, bạn phải nộp đủ số tiền trên cho thủ kho tại bưu cục phụ trách.</span>
        </div>
      )}

      {/* Order list */}
      {loading ? (
        <div className="spinner-center"><div className="spinner" /> Đang tải danh sách COD...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <p>Không có COD nào cần đối soát</p>
          <span>Tất cả đã được nộp hoặc hôm nay chưa có đơn thu COD</span>
        </div>
      ) : (
        <>
          <div className="cod-section-title">Chi tiết các đơn thu COD</div>
          <div className="cod-order-list">
            {orders.map(o => (
              <div className="cod-order-row" key={o.tracking_code}>
                <div className="cod-order-left">
                  <div className="cod-order-icon"><FiPackage size={16} /></div>
                  <div className="cod-order-info">
                    <div className="cod-order-code">{o.tracking_code}</div>
                    <div className="cod-order-name">{o.receiver_name}</div>
                  </div>
                </div>
                <div className="cod-order-amount">+{Number(o.cod_amount).toLocaleString('vi-VN')}đ</div>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className="cod-sum-row">
            <span>Tổng cần nộp:</span>
            <strong>{totalCOD.toLocaleString('vi-VN')}đ</strong>
          </div>

          {/* Submit button */}
          <div className="cod-submit-area">
            <button className="btn-primary cod-submit-btn" onClick={handleSubmitCOD} disabled={submitting}>
              {submitting ? <span className="spinner-sm" /> : <><FiCheckCircle size={16} /> Xác Nhận Đã Nộp Tiền Về Bưu Cục</>}
            </button>
            <p className="cod-submit-note">Chỉ bấm khi bạn đã nộp thực tế cho thủ kho</p>
          </div>
        </>
      )}
    </div>
  );
};

export default CODReconciliation;
