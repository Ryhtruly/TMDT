import { useState, useEffect } from 'react';
import { FiX, FiSearch, FiPrinter, FiXCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(''); // Rỗng = Tất cả
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchOrders = async (statusFilter = '') => {
    try {
      setLoading(true);
      const url = statusFilter ? `/shop/orders?status=${encodeURIComponent(statusFilter)}` : '/shop/orders';
      const res = await apiClient.get(url) as any;
      if (res?.status === 'success') {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter);
  }, [filter]);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm('Xác nhận Hủy Đơn Hàng này? Tiền ship (nếu có) sẽ hoàn Ví.')) return;
    try {
      await apiClient.delete(`/shop/orders/${id}/cancel`);
      alert('Hủy thành công!');
      setSelectedOrder(null);
      fetchOrders(filter);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi: Đã Lấy Hàng không thể hủy.');
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(orders.map(o => o.id_order));
    else setSelectedIds([]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredOrders = orders.filter(o => 
     (o.tracking_code || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
     (o.receiver_phone || '').includes(searchTerm) ||
     (o.receiver_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="orders-page">
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
           <h1 className="page-title">Quản Lý Đơn Hàng</h1>
           <div className="global-search" style={{width: '300px', height: '40px'}}>
             <FiSearch color="var(--slate-400)" />
             <input 
               type="text" 
               placeholder="Tìm theo Mã ĐH, SĐT nhận..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
           <button className="btn-outline" disabled={selectedIds.length===0}><FiPrinter/> In Toàn Bộ ({selectedIds.length})</button>
           <button className="btn-primary" onClick={() => navigate('/orders/create')}>+ Tạo Đơn Nhanh</button>
        </div>
      </div>

      <div className="filter-bar">
        {[
          { label: 'Tất cả', value: '' },
          { label: 'Đơn nháp', value: 'NHAP' },
          { label: 'Chờ bàn giao', value: 'CHỜ LẤY HÀNG' },
          { label: 'Đang lưu kho', value: 'ĐÃ LẤY HÀNG' },
          { label: 'Đang giao', value: 'ĐANG GIAO' },
          { label: 'Hoàn tất', value: 'GIAO THÀNH CÔNG' },
          { label: 'Đơn hủy', value: 'ĐÃ HỦY' }
        ].map((tab) => (
          <button 
            key={tab.label} 
            className={`filter-btn ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{padding: '40px', textAlign: 'center'}}>Đang tải dữ liệu...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="ghn-empty-state">
           <div className="empty-illustration">
             <div className="big-question">?</div>
           </div>
           <p>Không tìm thấy dữ liệu</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="ghn-table">
            <thead>
              <tr>
                <th style={{width: 40}}><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0} /></th>
                <th>Mã Đơn / Ngày Tạo</th>
                <th>Bên Nhận</th>
                <th>Thu Hộ COD</th>
                <th>Phí Ship</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id_order}>
                   <td><input type="checkbox" checked={selectedIds.includes(o.id_order)} onChange={() => toggleSelect(o.id_order)} /></td>
                   <td>
                      <span className="td-tracking" onClick={() => setSelectedOrder(o)}>GHN_{o.tracking_code}</span>
                      <span style={{fontSize: '12px', color: 'var(--slate-500)'}}>{new Date(o.created_at).toLocaleString('vi-VN')}</span>
                   </td>
                   <td>
                      <div><b>{o.receiver_name}</b></div>
                      <div style={{fontSize: '13px'}}>{o.receiver_phone}</div>
                   </td>
                   <td style={{fontWeight: 700, color: '#ff6b00'}}>{Number(o.cod_amount).toLocaleString()} đ</td>
                   <td>{Number(o.total_fee ?? (Number(o.shipping_fee || 0) + Number(o.insurance_fee || 0))).toLocaleString()} đ</td>
                   <td><span className={`status-badge ${o.status === 'GIAO THÀNH CÔNG' ? 'success' : o.status === 'ĐÃ HỦY' ? 'danger' : 'warning'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DRAWER CHI TIẾT ĐƠN */}
      {selectedOrder && (
        <div className="drawer-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
             <div className="drawer-header">
                <div>
                   <h2 style={{fontSize: '18px', fontWeight: 800}}>Chi tiết đơn hàng</h2>
                   <div style={{color: 'var(--primary-color)', fontWeight: 700}}>GHN_{selectedOrder.tracking_code}</div>
                </div>
                <button style={{background:'none', border:'none', cursor:'pointer'}} onClick={() => setSelectedOrder(null)}><FiX size={24}/></button>
             </div>
             <div className="drawer-body">
                <div style={{background: 'var(--slate-50)', padding: '16px', borderRadius: '8px', marginBottom: '24px'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                     <span style={{color: 'var(--slate-500)'}}>Người Nhận:</span>
                     <b>{selectedOrder.receiver_name} - {selectedOrder.receiver_phone}</b>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                     <span style={{color: 'var(--slate-500)'}}>Tổng thu COD:</span>
                     <b style={{color: '#ff6b00'}}>{Number(selectedOrder.cod_amount).toLocaleString()} đ</b>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}>
                     <span style={{color: 'var(--slate-500)'}}>Trọng lượng:</span>
                     <b>{selectedOrder.weight} gram</b>
                   </div>
                </div>

                <h3 style={{fontSize: '15px', fontWeight: 700}}>Hành Trình Giao Hàng</h3>
                <div className="timeline">
                   <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div>
                        <div style={{fontWeight: 700}}>{selectedOrder.status}</div>
                        <div style={{fontSize: '13px', color: 'var(--slate-500)'}}>Cập nhật lúc: {new Date().toLocaleString()}</div>
                      </div>
                   </div>
                   <div className="timeline-item">
                      <div className="timeline-dot" style={{background: 'var(--slate-300)'}}></div>
                      <div>
                        <div style={{fontWeight: 600, color: 'var(--slate-600)'}}>Đơn Hàng Được Tạo</div>
                        <div style={{fontSize: '13px', color: 'var(--slate-500)'}}>{new Date(selectedOrder.created_at).toLocaleString()}</div>
                      </div>
                   </div>
                </div>

                {selectedOrder.status === 'CHỜ LẤY HÀNG' && (
                  <button onClick={() => handleCancelOrder(selectedOrder.id_order)} className="btn-outline" style={{width: '100%', borderColor: 'red', color: 'red', marginTop: '40px'}}>
                     <FiXCircle /> Hủy / Báo Hỏng Đơn Này
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
