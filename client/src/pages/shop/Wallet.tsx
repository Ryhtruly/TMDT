import { useEffect, useState } from 'react';
import { FiDollarSign, FiPlus, FiTrash2 } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Wallet.css';

const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')} d`;
const dateTime = (value: any) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const emptyCodData = {
  eligible_orders: [],
  eligible_cod: 0,
  service_fee: 0,
  net_amount: 0,
  payouts: [],
};

const statusText = (status: string) => {
  const map: Record<string, string> = {
    CHO_DUYET: 'Chờ admin chuyển tiền',
    DA_CHUYEN: 'Đã chuyển về ngân hàng',
  };
  return map[status] || status || '-';
};

const Wallet = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [codData, setCodData] = useState<any>(emptyCodData);
  const [loading, setLoading] = useState(true);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({ bank_name: '', account_number: '', account_holder: '' });

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(0);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const [walletRes, banksRes, codRes]: any[] = await Promise.all([
        apiClient.get('/shop/wallet'),
        apiClient.get('/shop/banks'),
        apiClient.get('/cod/my-payouts'),
      ]);
      if (walletRes?.status === 'success') {
        setWallet(walletRes.data.wallet);
        setTransactions(walletRes.data.history || []);
      }
      if (banksRes?.status === 'success') setBanks(banksRes.data || []);
      if (codRes?.status === 'success') setCodData(codRes.data || emptyCodData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/shop/banks', bankData);
      setShowBankModal(false);
      setBankData({ bank_name: '', account_number: '', account_holder: '' });
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (!window.confirm('Xóa tài khoản ngân hàng này?')) return;
    try {
      await apiClient.delete(`/shop/banks/${id}`);
      fetchDocs();
    } catch (err) {
      alert('Không thể xóa do ràng buộc dữ liệu.');
    }
  };

  const openPayoutModal = () => {
    if (Number(codData.net_amount || 0) <= 0) {
      alert('Chưa có COD đủ điều kiện payout. Đơn phải giao thành công và shipper phải được admin xác nhận đã nộp tiền.');
      return;
    }

    if (banks.length === 0) {
      alert('COD sẽ được chuyển về tài khoản ngân hàng liên kết của shop. Vui lòng thêm tài khoản ngân hàng trước khi yêu cầu payout.');
      setShowBankModal(true);
      return;
    }

    if (!selectedBankId && banks.length === 1) {
      setSelectedBankId(String(banks[0].id_bank));
    }
    setShowPayoutModal(true);
  };

  const requestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(codData.net_amount || 0) <= 0) return alert('Chưa có COD đủ điều kiện rút.');
    if (!selectedBankId) return alert('Vui lòng chọn ngân hàng thụ hưởng.');
    try {
      const res: any = await apiClient.post('/cod/request', { id_bank: Number(selectedBankId) });
      alert(res?.data?.note || 'Đã gửi yêu cầu payout COD. Chờ admin duyệt chuyển khoản.');
      setShowPayoutModal(false);
      setSelectedBankId('');
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo yêu cầu payout COD.');
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return alert('Số tiền không hợp lệ.');
    try {
      const res: any = await apiClient.post('/shop/wallet/topup', { amount: topupAmount });
      if (res?.checkoutUrl) {
         window.location.href = res.checkoutUrl;
      } else {
         alert('Nạp tiền thành công.');
         setShowTopupModal(false);
         setTopupAmount(0);
         fetchDocs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi nạp tiền.');
    }
  };

  if (loading) return <div>Đang tải ví...</div>;

  const eligibleOrders = codData.eligible_orders || [];
  const payouts = codData.payouts || [];

  return (
    <div className="wallet-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Dòng Tiền & Đối Soát COD</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: 8 }}>
            Ví dùng để trả phí ship. COD thu hộ được payout riêng về ngân hàng sau khi shipper và admin đối soát.
          </p>
        </div>
      </div>

      <div className="wallet-overview">
        <div className="balance-card">
          <div className="balance-content">
            <div>
              <div style={{ fontSize: 16, opacity: 0.9 }}>Số dư Ví trả phí ship</div>
              <div className="balance-amount">{money(wallet?.balance)}</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>Hạn mức tín dụng: {money(wallet?.credit_limit)}</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>Khả dụng: {money(wallet?.available_balance)}</div>
            </div>
            <button className="btn-outline" onClick={() => setShowTopupModal(true)} style={{ background: 'white', color: 'var(--primary-color)', border: 'none', padding: '12px 24px' }}>
              Nạp Thêm Tiền
            </button>
          </div>
        </div>

        <div className="cod-card">
          <div>
            <div style={{ color: 'var(--slate-500)', fontWeight: 600 }}>COD đủ điều kiện payout</div>
            <div className="cod-amount">{money(codData.eligible_cod)}</div>
            <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Phí chuyển tiền: {money(codData.service_fee)}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#047857' }}>Thực nhận: {money(codData.net_amount)}</p>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={openPayoutModal}
          >
            Yêu Cầu Payout COD
          </button>
          <p className="cod-payout-note">
            COD sẽ chuyển về tài khoản ngân hàng liên kết của shop, không cộng vào ví trả phí ship.
          </p>
        </div>
      </div>

      <div className="history-section">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Đơn COD đủ điều kiện</h2>
        <div className="history-list">
          {eligibleOrders.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>
              Chưa có đơn COD đủ điều kiện. Đơn phải giao thành công và shipper phải được admin xác nhận đã nộp tiền.
            </div>
          ) : eligibleOrders.map((order: any) => (
            <div className="history-item" key={order.id_order}>
              <div className="history-desc">
                <FiDollarSign color="var(--primary-color)" />
                <div>
                  {order.tracking_code}
                  <div className="history-date">{order.store_name} - xác nhận: {dateTime(order.confirmed_at)}</div>
                </div>
              </div>
              <div className="history-amount amount-plus">+ {money(order.cod_amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="history-section">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Lịch sử payout COD</h2>
        <div className="history-list">
          {payouts.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>Chưa có phiên payout COD.</div>
          ) : payouts.map((payout: any) => (
            <div className="history-item" key={payout.id_payout}>
              <div className="history-desc">
                <FiDollarSign color="var(--primary-color)" />
                <div>
                  PAY-{payout.id_payout} - {statusText(payout.status)}
                  <div className="history-date">
                    {dateTime(payout.created_at)} - {payout.bank_name || '-'} {payout.account_number || ''}
                  </div>
                </div>
              </div>
              <div className="history-amount amount-plus">{money(payout.net_amount || Number(payout.total_cod || 0) - Number(payout.service_fee || 0))}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="history-section">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Lịch sử giao dịch ví ship</h2>
        <div className="history-list">
          {!transactions || transactions.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>Chưa có giao dịch nào phát sinh.</div>
          ) : transactions.map((item: any) => (
            <div className="history-item" key={item.id_trans || item.id_transaction}>
              <div className="history-desc">
                <FiDollarSign color="var(--primary-color)" />
                <div>
                  {item.type}
                  <div className="history-date">{dateTime(item.created_at)}</div>
                </div>
              </div>
              <div className={`history-amount ${Number(item.amount) >= 0 ? 'amount-plus' : 'amount-minus'}`}>
                {Number(item.amount) >= 0 ? '+' : ''} {money(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="banks-section">
        <div className="page-header" style={{ borderBottom: 'none' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tài Khoản Thụ Hưởng</h2>
          <button className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setShowBankModal(true)}>
            <FiPlus /> Thêm Ngân Hàng
          </button>
        </div>

        {banks.length === 0 ? (
          <p style={{ color: 'var(--slate-500)', marginTop: 16 }}>Bạn chưa thêm tài khoản ngân hàng để nhận COD.</p>
        ) : (
          <div className="bank-grid">
            {banks.map((bank) => (
              <div key={bank.id_bank} className="bank-card">
                <button className="btn-delete-bank" onClick={() => handleDeleteBank(bank.id_bank)}><FiTrash2 /></button>
                <div className="bank-name">{bank.bank_name}</div>
                <div className="bank-number">{bank.account_number}</div>
                <div className="bank-holder">{bank.account_holder}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBankModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Thêm Tài Khoản Ngân Hàng</h2>
            <form onSubmit={handleAddBank}>
              <div className="form-group">
                <label>Ngân hàng</label>
                <input required type="text" className="form-control" value={bankData.bank_name} onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Số tài khoản</label>
                <input required type="text" className="form-control" value={bankData.account_number} onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tên chủ tài khoản</label>
                <input required type="text" className="form-control" value={bankData.account_holder} onChange={(e) => setBankData({ ...bankData, account_holder: e.target.value.toUpperCase() })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowBankModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu Tài Khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Xác Nhận Chuyển COD Về Ngân Hàng</h2>
            <form onSubmit={requestPayout}>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                <div>Tổng COD: <strong>{money(codData.eligible_cod)}</strong></div>
                <div>Phí chuyển tiền: <strong>{money(codData.service_fee)}</strong></div>
                <div>Shop thuc nhan: <strong style={{ color: '#047857' }}>{money(codData.net_amount)}</strong></div>
                <div>Số đơn: <strong>{eligibleOrders.length}</strong></div>
                <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>
                  Tiền này sẽ chuyển ra tài khoản ngân hàng đã liên kết, không nạp vào ví nội bộ.
                </div>
              </div>
              <div className="form-group">
                <label>Ngân hàng nhan tien</label>
                <select required className="form-control" value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}>
                  <option value="">Chọn ngân hàng...</option>
                  {banks.map((bank) => (
                    <option value={bank.id_bank} key={bank.id_bank}>{bank.bank_name} - {bank.account_number}</option>
                  ))}
                </select>
              </div>
              <p style={{ color: 'var(--slate-600)', marginBottom: 20 }}>
                Sau khi gửi yêu cầu, admin sẽ xác nhận chuyển khoản. Các đơn trong phiên này sẽ không được yêu cầu lại.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPayoutModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTopupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nạp Tiền Vào Ví</h3>
            <form onSubmit={handleTopup}>
              <div className="form-group">
                <label>Số tiền cần nạp</label>
                <input required type="number" min="10000" className="form-control" value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowTopupModal(false)}>Đóng</button>
                <button type="submit" className="btn-primary">Xác Nhận Nạp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
