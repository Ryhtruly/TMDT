import { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiDollarSign, FiInfo, FiPackage, FiRefreshCw } from 'react-icons/fi';
import api from '../api/client';
import './COD.css';

interface PendingCashOrder {
  id_order?: number;
  tracking_code: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address?: string;
  cod_amount: number | string;
  receiver_fee_amount: number | string;
  cash_to_remit: number | string;
  payer_type?: string;
}

interface ReconciliationReceipt {
  id_reconciliation: number;
  status: string;
  total_cod: number | string;
  total_receiver_fee: number | string;
  total_cash: number | string;
  order_count: number | string;
  linked_order_count?: number | string;
  created_at: string;
  confirmed_at?: string | null;
  admin_note?: string | null;
  orders: PendingCashOrder[];
}

interface CodSummary {
  order_count: number;
  total_cod: number;
  total_receiver_fee: number;
  total_cash_held: number;
  orders: PendingCashOrder[];
  recent_reconciliations: ReconciliationReceipt[];
}

const emptySummary: CodSummary = {
  order_count: 0,
  total_cod: 0,
  total_receiver_fee: 0,
  total_cash_held: 0,
  orders: [],
  recent_reconciliations: [],
};

const CODReconciliation = () => {
  const [summary, setSummary] = useState<CodSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchCodSummary = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/shipper/cod-summary');
      setSummary(res?.data || emptySummary);
    } catch (err) {
      console.error(err);
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodSummary();
  }, []);

  const handleSubmitCOD = async () => {
    if (summary.orders.length === 0) {
      showToast('Khong co khoan tien nao can nop!', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await api.post('/shipper/cod-reconciliation', {});
      const amount = Number(res?.data?.total_cash || 0);
      const reconciliationId = Number(res?.data?.reconciliation_id || 0);
      showToast(`Da tao phieu nop ${amount.toLocaleString('vi-VN')}d, cho admin xac nhan!`, 'success');
      await fetchCodSummary();
      if (reconciliationId) {
        setExpandedReceiptId(reconciliationId);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Khong the gui doi soat. Thu lai sau!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cod-page">
      {toast && <div className={`toast toast-${toastType}`}>{toast}</div>}

      <div className="cod-header">
        <div>
          <h2 className="cod-title">Doi Soat Tien Mat</h2>
          <p className="cod-sub">COD va phi ship tien mat shipper chua nop ve buu cuc</p>
        </div>
        <button className="cod-refresh-btn" onClick={fetchCodSummary}>
          <FiRefreshCw size={15} />
        </button>
      </div>

      <div className="cod-total-card">
        <div className="cod-total-icon"><FiDollarSign size={32} /></div>
        <div className="cod-total-body">
          <div className="cod-total-label">Tong tien dang giu</div>
          <div className="cod-total-amount">
            {loading ? '...' : `${Number(summary.total_cash_held || 0).toLocaleString('vi-VN')}d`}
          </div>
          <div className="cod-total-count">{summary.order_count} don chua doi soat</div>
        </div>
      </div>

      {summary.recent_reconciliations.length > 0 && (
        <>
          <div className="cod-section-title">Phieu doi soat da gui</div>
          <div className="cod-receipt-list">
            {summary.recent_reconciliations.map((receipt) => {
              const isExpanded = expandedReceiptId === Number(receipt.id_reconciliation);
              const statusLabel =
                receipt.status === 'DA_XAC_NHAN'
                  ? 'Da xac nhan'
                  : receipt.status === 'CHO_XAC_NHAN'
                    ? 'Cho xac nhan'
                    : receipt.status;

              return (
                <div className="cod-receipt-card" key={receipt.id_reconciliation}>
                  <button
                    className="cod-receipt-head"
                    onClick={() => setExpandedReceiptId(isExpanded ? null : Number(receipt.id_reconciliation))}
                  >
                    <div>
                      <div className="cod-receipt-code">SCR-{receipt.id_reconciliation}</div>
                      <div className="cod-receipt-time">{new Date(receipt.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="cod-receipt-right">
                      <span className={`cod-receipt-status ${receipt.status === 'DA_XAC_NHAN' ? 'confirmed' : 'pending'}`}>
                        {statusLabel}
                      </span>
                      <strong>{Number(receipt.total_cash || 0).toLocaleString('vi-VN')}d</strong>
                    </div>
                  </button>

                  <div className="cod-receipt-meta">
                    <span>{Number(receipt.linked_order_count || receipt.order_count || 0)} don</span>
                    <span>COD: {Number(receipt.total_cod || 0).toLocaleString('vi-VN')}d</span>
                    <span>Phi tien mat: {Number(receipt.total_receiver_fee || 0).toLocaleString('vi-VN')}d</span>
                  </div>

                  {isExpanded && (
                    <div className="cod-receipt-body">
                      {receipt.orders.map((order) => (
                        <div className="cod-receipt-order" key={`${receipt.id_reconciliation}-${order.tracking_code}`}>
                          <div>
                            <div className="cod-order-code">{order.tracking_code}</div>
                            <div className="cod-order-name">{order.receiver_name}</div>
                            {Number(order.cod_amount || 0) > 0 && (
                              <div className="cod-order-name">COD: {Number(order.cod_amount).toLocaleString('vi-VN')}d</div>
                            )}
                            {Number(order.receiver_fee_amount || 0) > 0 && (
                              <div className="cod-order-name">
                                Phi ship/bao hiem: {Number(order.receiver_fee_amount).toLocaleString('vi-VN')}d
                              </div>
                            )}
                          </div>
                          <div className="cod-order-amount">{Number(order.cash_to_remit || 0).toLocaleString('vi-VN')}d</div>
                        </div>
                      ))}

                      {receipt.status === 'CHO_XAC_NHAN' && (
                        <div className="cod-receipt-note">
                          <FiInfo size={13} />
                          <span>Phieu nay dang cho admin xac nhan da nhan tien mat.</span>
                        </div>
                      )}

                      {receipt.status === 'DA_XAC_NHAN' && receipt.confirmed_at && (
                        <div className="cod-receipt-note">
                          <FiInfo size={13} />
                          <span>Admin da xac nhan luc {new Date(receipt.confirmed_at).toLocaleString('vi-VN')}.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && summary.orders.length > 0 && (
        <>
          <div className="cod-warn-box">
            <FiAlertCircle size={14} />
            <span>Cuoi ca, shipper phai nop du COD va moi khoan phi ship/bao hiem da thu bang tien mat.</span>
          </div>

          <div className="cod-sum-row" style={{ marginTop: 12 }}>
            <span>Tong COD:</span>
            <strong>{Number(summary.total_cod || 0).toLocaleString('vi-VN')}d</strong>
          </div>
          <div className="cod-sum-row">
            <span>Phi ship/bao hiem tien mat:</span>
            <strong>{Number(summary.total_receiver_fee || 0).toLocaleString('vi-VN')}d</strong>
          </div>
        </>
      )}

      {loading ? (
        <div className="spinner-center"><div className="spinner" /> Dang tai danh sach COD...</div>
      ) : summary.orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">Tien</div>
          <p>Khong co khoan tien nao can doi soat moi</p>
          <span>Neu ban da gui phieu, no van nam o muc "Phieu doi soat da gui" cho toi khi admin xac nhan</span>
        </div>
      ) : (
        <>
          <div className="cod-section-title">Chi tiet cac don chua nop tien</div>
          <div className="cod-order-list">
            {summary.orders.map((order) => (
              <div className="cod-order-row" key={order.tracking_code}>
                <div className="cod-order-left">
                  <div className="cod-order-icon"><FiPackage size={16} /></div>
                  <div className="cod-order-info">
                    <div className="cod-order-code">{order.tracking_code}</div>
                    <div className="cod-order-name">{order.receiver_name}</div>
                    {Number(order.cod_amount || 0) > 0 && (
                      <div className="cod-order-name">COD: {Number(order.cod_amount).toLocaleString('vi-VN')}d</div>
                    )}
                    {Number(order.receiver_fee_amount || 0) > 0 && (
                      <div className="cod-order-name">Phi ship/bao hiem tien mat: {Number(order.receiver_fee_amount).toLocaleString('vi-VN')}d</div>
                    )}
                  </div>
                </div>
                <div className="cod-order-amount">+{Number(order.cash_to_remit).toLocaleString('vi-VN')}d</div>
              </div>
            ))}
          </div>

          <div className="cod-sum-row">
            <span>Tong can nop:</span>
            <strong>{Number(summary.total_cash_held || 0).toLocaleString('vi-VN')}d</strong>
          </div>

          <div className="cod-submit-area">
            <button className="btn-primary cod-submit-btn" onClick={handleSubmitCOD} disabled={submitting}>
              {submitting ? <span className="spinner-sm" /> : <><FiCheckCircle size={16} /> Xac Nhan Da Nop Tien Ve Buu Cuc</>}
            </button>
            <p className="cod-submit-note">Chi bam khi ban da nop thuc te cho thu kho</p>
          </div>
        </>
      )}
    </div>
  );
};

export default CODReconciliation;
