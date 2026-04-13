import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiPackage, FiAlertCircle, FiRefreshCw, FiInfo } from 'react-icons/fi';
import api from '../api/client';
import './COD.css';

interface PendingCashOrder {
  tracking_code: string;
  receiver_name: string;
  receiver_phone: string;
  cod_amount: number | string;
  receiver_fee_amount: number | string;
  cash_to_remit: number | string;
  payer_type: string;
}

interface CodSummary {
  order_count: number;
  total_cod: number;
  total_receiver_fee: number;
  total_cash_held: number;
  orders: PendingCashOrder[];
}

const emptySummary: CodSummary = {
  order_count: 0,
  total_cod: 0,
  total_receiver_fee: 0,
  total_cash_held: 0,
  orders: [],
};

const CODReconciliation = () => {
  const [summary, setSummary] = useState<CodSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState(0);
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
      setSubmittedAmount(amount);
      setSubmitted(true);
      showToast(`Da tao phieu nop ${amount.toLocaleString('vi-VN')}d, cho admin xac nhan!`, 'success');
      setSummary(emptySummary);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Khong the gui doi soat. Thu lai sau!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="cod-page">
        <div className="cod-success-screen">
          <div className="cod-success-icon"><FiCheckCircle size={50} /></div>
          <h3>Da Gui Phieu Doi Soat!</h3>
          <p>
            Ban da xac nhan nop <br />
            <strong>{submittedAmount.toLocaleString('vi-VN')}d</strong>
            <br />
            ve buu cuc trong ca lam nay, cho admin xac nhan da nhan tien.
          </p>
          <div className="cod-success-note">
            <FiInfo size={13} />
            Danh sach don da nop da duoc tru khoi muc "tien dang giu"; COD chi du dieu kien tra shop sau khi admin xac nhan.
          </div>
          <button
            className="btn-outline"
            style={{ marginTop: 16 }}
            onClick={() => {
              setSubmitted(false);
              fetchCodSummary();
            }}
          >
            Quay lai
          </button>
        </div>
      </div>
    );
  }

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
          <div className="empty-state-icon">🎉</div>
          <p>Khong co khoan tien nao can doi soat</p>
          <span>Tat ca COD/phi thu ho da duoc nop hoac chua co don thu tien</span>
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
