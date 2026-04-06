import { useState, useEffect } from 'react';
import { FiCreditCard, FiDollarSign, FiPlus, FiTrash2 } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Wallet.css';

const Wallet = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bank Modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({ bank_name: '', account_number: '', account_holder: '' });

  // Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  
  // Topup
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const [walletRes, banksRes] = await Promise.all([
        apiClient.get('/shop/wallet') as any,
        apiClient.get('/shop/banks') as any
      ]);
      if (walletRes?.status === 'success') setWallet(walletRes.data);
      if (banksRes?.status === 'success') setBanks(banksRes.data || []);
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
    if(!window.confirm('Xóa thẻ ngân hàng này?')) return;
    try {
      await apiClient.delete(`/shop/banks/${id}`);
      fetchDocs();
    } catch (err) {
      alert('Không thể xóa do ràng buộc dữ liệu.');
    }
  };

  const requestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 10000) return alert('Số tiền tối thiểu là 10,000 đ');
    if (!selectedBankId) return alert('Vui lòng chọn ngân hàng thụ hưởng');
    try {
      await apiClient.post('/shop/wallet/withdraw', { amount: withdrawAmount, id_bank: selectedBankId });
      alert('Gửi yêu cầu Rút COD thành công. Kế toán sẽ phê duyệt!');
      setShowPayoutModal(false);
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể rút COD lúc này.');
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return alert('Số tiền không hợp lệ');
    try {
      await apiClient.post('/shop/wallet/topup', { amount: topupAmount });
      alert('Nạp tiền thành công!');
      setShowTopupModal(false);
      fetchDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi nạp tiền');
    }
  };

  if (loading) return <div>Đang tải ví...</div>;

  return (
    <div className="wallet-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Dòng Tiền & Đối Soát COD</h1>
          <p style={{color: 'var(--slate-500)', marginTop: '8px'}}>Số dư ví, quản lý ngân hàng và yêu cầu rút tiền COD.</p>
        </div>
      </div>

      <div className="wallet-overview">
        <div className="balance-card">
          <div className="balance-content">
            <div>
              <div style={{fontSize: '16px', opacity: 0.9}}>Số dư Ví (Dùng trả phí Ship)</div>
              <div className="balance-amount">{Number(wallet?.balance || 0).toLocaleString('vi-VN')} đ</div>
              <div style={{fontSize: '14px', opacity: 0.8}}>Hạn mức tín dụng: {Number(wallet?.credit_limit || 0).toLocaleString('vi-VN')} đ</div>
            </div>
            <button className="btn-outline" onClick={() => setShowTopupModal(true)} style={{background: 'white', color: 'var(--primary-color)', border: 'none', padding: '12px 24px'}}>
              Nạp Thêm Tiền
            </button>
          </div>
        </div>

        <div className="cod-card">
          <div>
             <div style={{color: 'var(--slate-500)', fontWeight: 600}}>Tiền thu hộ COD chờ đối soát</div>
             <div className="cod-amount">{Number(wallet?.credit_limit || 0).toLocaleString()} đ</div>
             <p style={{fontSize: '13px', color: 'var(--danger)'}}>* Phí dịch vụ Rút: 5,500đ / Lần</p>
          </div>
          <button 
             className="btn-primary" 
             style={{width: '100%'}} 
             onClick={() => setShowPayoutModal(true)}
             disabled={Number(wallet?.balance || 0) < 5500}
             title={Number(wallet?.balance || 0) < 5500 ? "Không đủ tiền trả phí dịch vụ" : ""}
          >
            Yêu Cầu Rút COD
          </button>
        </div>
      </div>

      {/* LỊCH SỬ GIAO DỊCH */}
      <div className="history-section">
        <h2 style={{fontSize: '18px', fontWeight: 700}}>Lịch sử giao dịch ví</h2>
        <div className="history-list">
           {!transactions || transactions.length === 0 ? (
             <div style={{color: 'var(--slate-400)', textAlign: 'center', padding: '20px'}}>Chưa có giao dịch nào phát sinh.</div>
           ) : transactions.map((item: any) => (
             <div className="history-item" key={item.id_transaction}>
               <div className="history-desc">
                  <FiDollarSign color="var(--primary-color)" /> 
                  <div>
                     {item.type}
                     <div className="history-date">{new Date(item.created_at).toLocaleString('vi-VN')}</div>
                  </div>
               </div>
               <div className={`history-amount ${Number(item.amount) >= 0 ? 'amount-plus' : 'amount-minus'}`}>
                 {Number(item.amount) >= 0 ? '+' : ''} {Number(item.amount).toLocaleString('vi-VN')} đ
               </div>
             </div>
           ))}
        </div>
      </div>

      <div className="banks-section">
        <div className="page-header" style={{borderBottom: 'none'}}>
          <h2 style={{fontSize: '18px', fontWeight: 700}}>Tài Khoản Thụ Hưởng (Bank)</h2>
          <button className="btn-outline" style={{padding: '8px 16px'}} onClick={() => setShowBankModal(true)}>
            <FiPlus /> Thêm Ngân Hàng
          </button>
        </div>
        
        {banks.length === 0 ? (
          <p style={{color: 'var(--slate-500)', marginTop: '16px'}}>Bạn chưa thêm tài khoản ngân hàng nào để nhận COD.</p>
        ) : (
          <div className="bank-grid">
            {banks.map(bank => (
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
                <label>Ngân hàng (VD: Vietcombank, MB Bank)</label>
                <input required type="text" className="form-control" value={bankData.bank_name} onChange={e => setBankData({...bankData, bank_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Số Tài Khoản</label>
                <input required type="text" className="form-control" value={bankData.account_number} onChange={e => setBankData({...bankData, account_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Tên Chủ Tài Khoản (In hoa không dấu)</label>
                <input required type="text" className="form-control" value={bankData.account_holder} onChange={e => setBankData({...bankData, account_holder: e.target.value.toUpperCase()})} />
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
            <h2 className="modal-title">Xác Nhận Rút Tiền Ví Hoặc Xả COD</h2>
            <form onSubmit={requestPayout}>
              <div className="form-group">
                <label>Số tiền rút (Tối thiểu 10,000 đ)</label>
                <input required type="number" min="10000" className="form-control" value={withdrawAmount} onChange={e => setWithdrawAmount(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Ngân hàng nhận</label>
                <select required className="form-control" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                   <option value="">Chọn ngân hàng...</option>
                   {banks.map(b => (
                     <option value={b.id_bank} key={b.id_bank}>{b.bank_name} - {b.account_number}</option>
                   ))}
                </select>
              </div>
              <p style={{color: 'var(--slate-600)', marginBottom: '20px'}}>Phí giao dịch rút tiền hoặc đối soát là <strong>5,500 đ</strong> sẽ bị trừ vào Ví trực tiếp.</p>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPayoutModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Đồng Ý Rút</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL NẠP TIỀN VÍ */}
      {showTopupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{fontSize: '18px', fontWeight: 700, marginBottom: '20px'}}>Nạp Tiền Vào Ví</h3>
            <form onSubmit={handleTopup}>
              <div className="ghn-form-group" style={{marginBottom: '16px'}}>
                <label>Số tiền cần nạp (đ)</label>
                <input required type="number" min="10000" className="ghn-input" value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))} />
              </div>
              <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px'}}>
                 <button type="button" className="btn-outline" onClick={() => setShowTopupModal(false)}>Đóng</button>
                 <button type="submit" className="btn-primary">Xác Nhận Nạp Thẻ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
