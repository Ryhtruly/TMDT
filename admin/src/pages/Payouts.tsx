import { useState, useEffect } from 'react';
import { FiDollarSign, FiClock, FiCheckCircle } from 'react-icons/fi';
import apiClient from '../api/client';

const Payouts = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/cod/pending');
      const all = res.data || [];
      setPending(all.filter((p: any) => p.status !== 'ĐÃ CHUYỂN' && p.status !== 'APPROVED'));
      setApproved(all.filter((p: any) => p.status === 'ĐÃ CHUYỂN' || p.status === 'APPROVED'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approvePayout = async (id: number, shopName: string) => {
    if (!window.confirm(`Xác nhận chuyển COD cho ${shopName}?`)) return;
    try {
      await apiClient.put(`/cod/${id}/approve`);
      fetchData();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const currentList = activeTab === 'pending' ? pending : approved;
  const totalPages = Math.ceil(currentList.length / pageSize);
  const paged = currentList.slice((page - 1) * pageSize, page * pageSize);

  const totalPendingAmount = pending.reduce((sum, p) => sum + parseFloat(p.total_cod || p.amount || 0), 0);

  return (
    <div className="payouts-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Đối Soát COD — Thanh Toán Shop</h1>
          <p className="page-subtitle">Duyệt và theo dõi chi trả tiền COD cho đối tác.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Chờ duyệt</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}><FiClock /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{pending.length}</div>
            <p className="stat-desc">phiên đang chờ</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Tổng COD chờ duyệt</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}><FiDollarSign /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{totalPendingAmount.toLocaleString('vi-VN')}₫</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <h3 className="stat-title">Đã duyệt</h3>
            <div className="stat-icon-soft" style={{ backgroundColor: '#d1fae5', color: '#047857' }}><FiCheckCircle /></div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">{approved.length}</div>
            <p className="stat-desc">phiên đã thanh toán</p>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => { setActiveTab('pending'); setPage(1); }}>
            <FiClock className="tab-icon" /> Chờ Duyệt ({pending.length})
          </button>
          <button className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => { setActiveTab('approved'); setPage(1); }}>
            <FiCheckCircle className="tab-icon" /> Đã Thanh Toán ({approved.length})
          </button>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Đang tải dữ liệu COD...</div> : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>ID</th>
                    <th style={{ width: '22%' }}>Shop</th>
                    <th style={{ width: '20%' }}>Số tiền COD</th>
                    <th style={{ width: '20%' }}>Ngày yêu cầu</th>
                    <th style={{ width: '15%' }}>Trạng thái</th>
                    {activeTab === 'pending' && <th style={{ width: '15%' }} className="text-right">Duyệt</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p: any) => (
                    <tr key={p.id_payout}>
                      <td><span className="badge-id">PAY-{p.id_payout}</span></td>
                      <td>
                        <div className="font-medium">{p.shop_name || `SHOP-${p.id_shop}`}</div>
                        {p.phone && <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{p.phone}</div>}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#047857', fontSize: '1.05rem' }}>
                          {parseFloat(p.total_cod || p.amount || 0).toLocaleString('vi-VN')}₫
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {new Date(p.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                          backgroundColor: activeTab === 'pending' ? '#fef9c3' : '#d1fae5',
                          color: activeTab === 'pending' ? '#854d0e' : '#047857'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="text-right">
                          <button className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                            onClick={() => approvePayout(p.id_payout, p.shop_name || `SHOP-${p.id_shop}`)}>
                            ✓ Duyệt
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr><td colSpan={activeTab === 'pending' ? 6 : 5} className="empty-state">
                      {activeTab === 'pending' ? 'Không có phiên COD nào đang chờ duyệt.' : 'Chưa có phiên nào được thanh toán.'}
                    </td></tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', alignItems: 'center' }}>
                  <button className="action-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className="action-btn"
                      style={{ fontWeight: p === page ? 700 : 400, backgroundColor: p === page ? 'var(--primary-color)' : 'transparent', color: p === page ? 'white' : 'inherit', borderRadius: '6px', minWidth: '32px' }}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="action-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Tổng: {currentList.length} kết quả</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payouts;
