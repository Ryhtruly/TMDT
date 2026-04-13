import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiDollarSign, FiTruck } from 'react-icons/fi';
import apiClient from '../api/client';

const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')} d`;
const dateTime = (value: any) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const statusStyle = (status: string) => {
  if (status === 'DA_XAC_NHAN' || status === 'DA_CHUYEN') return { background: '#d1fae5', color: '#047857' };
  if (status === 'CHO_XAC_NHAN' || status === 'CHO_DUYET') return { background: '#fef9c3', color: '#854d0e' };
  return { background: '#e5e7eb', color: '#374151' };
};

const statusText = (status: string) => {
  const map: Record<string, string> = {
    CHO_XAC_NHAN: 'Cho admin xac nhan',
    DA_XAC_NHAN: 'Da xac nhan tien',
    CHO_DUYET: 'Cho chuyen shop',
    DA_CHUYEN: 'Da chuyen shop',
  };
  return map[status] || status || '-';
};

const Payouts = () => {
  const [activeFlow, setActiveFlow] = useState<'shipper' | 'shop'>('shipper');
  const [shipperRows, setShipperRows] = useState<any[]>([]);
  const [payoutRows, setPayoutRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shipperRes, payoutRes]: any[] = await Promise.all([
        apiClient.get('/admin/shipper-cod-reconciliations'),
        apiClient.get('/cod/payouts'),
      ]);
      setShipperRows(shipperRes?.data || []);
      setPayoutRows(payoutRes?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmShipperCash = async (row: any) => {
    if (!window.confirm(`Xac nhan da nhan ${money(row.total_cash)} tu shipper ${row.shipper_name || row.shipper_phone}?`)) return;
    try {
      await apiClient.put(`/admin/shipper-cod-reconciliations/${row.id_reconciliation}/confirm`, {
        admin_note: 'Admin da nhan du tien mat tu shipper',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const approveShopPayout = async (row: any) => {
    if (!window.confirm(`Xac nhan da chuyen ${money(row.net_amount)} ve ngan hang cua ${row.shop_name || row.phone}?`)) return;
    try {
      await apiClient.put(`/cod/${row.id_payout}/approve`, {
        admin_note: 'Admin da chuyen tien COD ve tai khoan ngan hang shop',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const pendingCash = shipperRows.filter((row) => row.status === 'CHO_XAC_NHAN');
  const confirmedCash = shipperRows.filter((row) => row.status === 'DA_XAC_NHAN');
  const pendingPayouts = payoutRows.filter((row) => row.status === 'CHO_DUYET');
  const paidPayouts = payoutRows.filter((row) => row.status === 'DA_CHUYEN');
  const pendingCashAmount = pendingCash.reduce((sum, row) => sum + Number(row.total_cash || 0), 0);
  const pendingPayoutAmount = pendingPayouts.reduce((sum, row) => sum + Number(row.net_amount || 0), 0);

  return (
    <div className="payouts-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Doi Soat COD</h1>
          <p className="page-subtitle">Quan ly 2 buoc: shipper nop tien ve APP, sau do APP chuyen COD ve shop.</p>
        </div>
        <button className="btn-outline" onClick={fetchData}>Lam moi</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Shipper cho xac nhan</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}><FiTruck /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{pendingCash.length}</div>
            <p className="stat-desc">{money(pendingCashAmount)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Da thu tu shipper</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#d1fae5', color: '#047857' }}><FiCheckCircle /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{confirmedCash.length}</div>
            <p className="stat-desc">phieu da xac nhan</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Shop cho payout</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}><FiDollarSign /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{pendingPayouts.length}</div>
            <p className="stat-desc">{money(pendingPayoutAmount)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Da chuyen shop</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}><FiClock /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{paidPayouts.length}</div>
            <p className="stat-desc">phien payout</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeFlow === 'shipper' ? 'active' : ''}`} onClick={() => setActiveFlow('shipper')}>
            <FiTruck className="tab-icon" /> Shipper nop tien ({pendingCash.length})
          </button>
          <button className={`tab-btn ${activeFlow === 'shop' ? 'active' : ''}`} onClick={() => setActiveFlow('shop')}>
            <FiDollarSign className="tab-icon" /> Payout cho shop ({pendingPayouts.length})
          </button>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Dang tai du lieu COD...</div> : activeFlow === 'shipper' ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Shipper</th>
                  <th>COD shop</th>
                  <th>Phi tien mat</th>
                  <th>Tong tien mat</th>
                  <th>So don</th>
                  <th>Ngay gui</th>
                  <th>Trang thai</th>
                  <th className="text-right">Xu ly</th>
                </tr>
              </thead>
              <tbody>
                {shipperRows.map((row) => (
                  <tr key={row.id_reconciliation}>
                    <td><span className="badge-id">SCR-{row.id_reconciliation}</span></td>
                    <td>
                      <div className="font-medium">{row.shipper_name || 'Shipper'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{row.shipper_phone}</div>
                    </td>
                    <td>{money(row.total_cod)}</td>
                    <td>{money(row.total_receiver_fee)}</td>
                    <td><strong style={{ color: '#047857' }}>{money(row.total_cash)}</strong></td>
                    <td>{row.order_count || row.linked_order_count || 0}</td>
                    <td>{dateTime(row.created_at)}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700, ...statusStyle(row.status) }}>{statusText(row.status)}</span></td>
                    <td className="text-right">
                      {row.status === 'CHO_XAC_NHAN' ? (
                        <button className="btn-primary" style={{ padding: '6px 14px' }} onClick={() => confirmShipperCash(row)}>
                          Xac nhan da thu
                        </button>
                      ) : <span style={{ color: '#6b7280' }}>{dateTime(row.confirmed_at)}</span>}
                    </td>
                  </tr>
                ))}
                {shipperRows.length === 0 && (
                  <tr><td colSpan={9} className="empty-state">Chua co phieu shipper nop tien COD.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Shop</th>
                  <th>COD goc</th>
                  <th>Phi</th>
                  <th>Thuc chuyen</th>
                  <th>So don</th>
                  <th>Ngan hang</th>
                  <th>Ngay yeu cau</th>
                  <th>Trang thai</th>
                  <th className="text-right">Xu ly</th>
                </tr>
              </thead>
              <tbody>
                {payoutRows.map((row) => (
                  <tr key={row.id_payout}>
                    <td><span className="badge-id">PAY-{row.id_payout}</span></td>
                    <td>
                      <div className="font-medium">{row.shop_name || `SHOP-${row.id_shop || row.id_account}`}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{row.phone}</div>
                    </td>
                    <td>{money(row.total_cod)}</td>
                    <td>{money(row.service_fee)}</td>
                    <td><strong style={{ color: '#047857' }}>{money(row.net_amount)}</strong></td>
                    <td>{row.order_count || 0}</td>
                    <td>
                      <div className="font-medium">{row.bank_name || '-'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{row.account_number || '-'}</div>
                    </td>
                    <td>{dateTime(row.created_at || row.payout_date)}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700, ...statusStyle(row.status) }}>{statusText(row.status)}</span></td>
                    <td className="text-right">
                      {row.status === 'CHO_DUYET' ? (
                        <button className="btn-primary" style={{ padding: '6px 14px' }} onClick={() => approveShopPayout(row)}>
                          Xac nhan chuyen
                        </button>
                      ) : <span style={{ color: '#6b7280' }}>{dateTime(row.approved_at)}</span>}
                    </td>
                  </tr>
                ))}
                {payoutRows.length === 0 && (
                  <tr><td colSpan={10} className="empty-state">Chua co yeu cau payout COD tu shop.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payouts;
