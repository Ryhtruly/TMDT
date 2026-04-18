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
    CHO_DUYET: 'Cho admin chuyen tien',
    DA_CHUYEN: 'Da chuyen ve ngan hang',
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
      alert(err.response?.data?.message || 'Co loi xay ra.');
    }
  };

  const handleDeleteBank = async (id: number) => {
    if (!window.confirm('Xoa tai khoan ngan hang nay?')) return;
    try {
      await apiClient.delete(`/shop/banks/${id}`);
      fetchDocs();
    } catch (err) {
      alert('Khong the xoa do rang buoc du lieu.');
    }
  };

  const openPayoutModal = () => {
    if (Number(codData.net_amount || 0) <= 0) {
      alert('Chua co COD du dieu kien payout. Don phai giao thanh cong va shipper phai duoc admin xac nhan da nop tien.');
      return;
    }

    if (banks.length === 0) {
      alert('COD se duoc chuyen ve tai khoan ngan hang lien ket cua shop. Vui long them tai khoan ngan hang truoc khi yeu cau payout.');
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
    if (Number(codData.net_amount || 0) <= 0) return alert('Chua co COD du dieu kien rut.');
    if (!selectedBankId) return alert('Vui long chon ngan hang thu huong.');
    try {
      const res: any = await apiClient.post('/cod/request', { id_bank: Number(selectedBankId) });
      alert(res?.data?.note || 'Da gui yeu cau payout COD. Cho admin duyet chuyen khoan.');
      setShowPayoutModal(false);
      setSelectedBankId('');
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Khong the tao yeu cau payout COD.');
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return alert('So tien khong hop le.');
    try {
      const res: any = await apiClient.post('/shop/wallet/topup', { amount: topupAmount });
      if (res?.checkoutUrl) {
         window.location.href = res.checkoutUrl;
      } else {
         alert('Nap tien thanh cong.');
         setShowTopupModal(false);
         setTopupAmount(0);
         fetchDocs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Co loi khi nap tien.');
    }
  };

  if (loading) return <div>Dang tai vi...</div>;

  const eligibleOrders = codData.eligible_orders || [];
  const payouts = codData.payouts || [];

  return (
    <div className="wallet-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quan Ly Dong Tien & Doi Soat COD</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: 8 }}>
            Vi dung de tra phi ship. COD thu ho duoc payout rieng ve ngan hang sau khi shipper va admin doi soat.
          </p>
        </div>
      </div>

      <div className="wallet-overview">
        <div className="balance-card">
          <div className="balance-content">
            <div>
              <div style={{ fontSize: 16, opacity: 0.9 }}>So du Vi tra phi ship</div>
              <div className="balance-amount">{money(wallet?.balance)}</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>Han muc tin dung: {money(wallet?.credit_limit)}</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>Kha dung: {money(wallet?.available_balance)}</div>
            </div>
            <button className="btn-outline" onClick={() => setShowTopupModal(true)} style={{ background: 'white', color: 'var(--primary-color)', border: 'none', padding: '12px 24px' }}>
              Nap Them Tien
            </button>
          </div>
        </div>

        <div className="cod-card">
          <div>
            <div style={{ color: 'var(--slate-500)', fontWeight: 600 }}>COD du dieu kien payout</div>
            <div className="cod-amount">{money(codData.eligible_cod)}</div>
            <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Phi chuyen tien: {money(codData.service_fee)}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#047857' }}>Thuc nhan: {money(codData.net_amount)}</p>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={openPayoutModal}
          >
            Yeu Cau Payout COD
          </button>
          <p className="cod-payout-note">
            COD se chuyen ve tai khoan ngan hang lien ket cua shop, khong cong vao vi tra phi ship.
          </p>
        </div>
      </div>

      <div className="history-section">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Don COD du dieu kien</h2>
        <div className="history-list">
          {eligibleOrders.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>
              Chua co don COD du dieu kien. Don phai giao thanh cong va shipper phai duoc admin xac nhan da nop tien.
            </div>
          ) : eligibleOrders.map((order: any) => (
            <div className="history-item" key={order.id_order}>
              <div className="history-desc">
                <FiDollarSign color="var(--primary-color)" />
                <div>
                  {order.tracking_code}
                  <div className="history-date">{order.store_name} - xac nhan: {dateTime(order.confirmed_at)}</div>
                </div>
              </div>
              <div className="history-amount amount-plus">+ {money(order.cod_amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="history-section">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Lich su payout COD</h2>
        <div className="history-list">
          {payouts.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>Chua co phien payout COD.</div>
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
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Lich su giao dich vi ship</h2>
        <div className="history-list">
          {!transactions || transactions.length === 0 ? (
            <div style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 20 }}>Chua co giao dich nao phat sinh.</div>
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tai Khoan Thu Huong</h2>
          <button className="btn-outline" style={{ padding: '8px 16px' }} onClick={() => setShowBankModal(true)}>
            <FiPlus /> Them Ngan Hang
          </button>
        </div>

        {banks.length === 0 ? (
          <p style={{ color: 'var(--slate-500)', marginTop: 16 }}>Ban chua them tai khoan ngan hang de nhan COD.</p>
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
            <h2 className="modal-title">Them Tai Khoan Ngan Hang</h2>
            <form onSubmit={handleAddBank}>
              <div className="form-group">
                <label>Ngan hang</label>
                <input required type="text" className="form-control" value={bankData.bank_name} onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>So tai khoan</label>
                <input required type="text" className="form-control" value={bankData.account_number} onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ten chu tai khoan</label>
                <input required type="text" className="form-control" value={bankData.account_holder} onChange={(e) => setBankData({ ...bankData, account_holder: e.target.value.toUpperCase() })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowBankModal(false)}>Huy</button>
                <button type="submit" className="btn-primary">Luu Tai Khoan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Xac Nhan Chuyen COD Ve Ngan Hang</h2>
            <form onSubmit={requestPayout}>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                <div>Tong COD: <strong>{money(codData.eligible_cod)}</strong></div>
                <div>Phi chuyen tien: <strong>{money(codData.service_fee)}</strong></div>
                <div>Shop thuc nhan: <strong style={{ color: '#047857' }}>{money(codData.net_amount)}</strong></div>
                <div>So don: <strong>{eligibleOrders.length}</strong></div>
                <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>
                  Tien nay se chuyen ra tai khoan ngan hang da lien ket, khong nap vao vi noi bo.
                </div>
              </div>
              <div className="form-group">
                <label>Ngan hang nhan tien</label>
                <select required className="form-control" value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}>
                  <option value="">Chon ngan hang...</option>
                  {banks.map((bank) => (
                    <option value={bank.id_bank} key={bank.id_bank}>{bank.bank_name} - {bank.account_number}</option>
                  ))}
                </select>
              </div>
              <p style={{ color: 'var(--slate-600)', marginBottom: 20 }}>
                Sau khi gui yeu cau, admin se xac nhan chuyen khoan. Cac don trong phien nay se khong duoc yeu cau lai.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPayoutModal(false)}>Huy</button>
                <button type="submit" className="btn-primary">Gui Yeu Cau</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTopupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nap Tien Vao Vi</h3>
            <form onSubmit={handleTopup}>
              <div className="form-group">
                <label>So tien can nap</label>
                <input required type="number" min="10000" className="form-control" value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowTopupModal(false)}>Dong</button>
                <button type="submit" className="btn-primary">Xac Nhan Nap</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
