import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { FiPackage, FiCheckCircle, FiTruck, FiBox, FiCornerDownRight } from 'react-icons/fi';
import './Bagging.css';

interface OrderItem {
  id_order: number;
  tracking_code: string;
  receiver_name: string;
  province: string;
  district: string;
  last_updated: string;
}

interface BagGroup {
  next_hop_type: 'HUB' | 'SPOKE' | 'UNKNOWN';
  next_hop_id: number;
  next_hop_name: string;
  orders: OrderItem[];
}

const Bagging = () => {
  const [groups, setGroups] = useState<BagGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null); // key of group being bagged
  const [bagResults, setBagResults] = useState<Record<string, string>>({}); // key → bag_code

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/stockkeeper/bags/suggestions');
      setGroups(res.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const handleCreateBag = async (group: BagGroup) => {
    const key = `${group.next_hop_type}_${group.next_hop_id}`;
    try {
      setCreatingFor(key);
      const res: any = await api.post('/stockkeeper/bags', {
        next_hop_id: group.next_hop_id,
        next_hop_type: group.next_hop_type,
        order_ids: group.orders.map(o => o.id_order)
      });
      setBagResults(prev => ({ ...prev, [key]: res.data.bag_code }));
      // Remove this group from list since orders are now bagged
      setGroups(prev => prev.filter(g => `${g.next_hop_type}_${g.next_hop_id}` !== key));
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setCreatingFor(null);
    }
  };

  return (
    <div className="bagging-page">
      <div className="bagging-header">
        <div className="bagging-header-icon"><FiBox size={36} /></div>
        <div>
          <h1>Gom Bao Kiện</h1>
          <p>Hệ thống tự động nhóm các đơn theo điểm đến tiếp theo. Chọn nhóm và bấm <strong>Gom Bao</strong>.</p>
        </div>
      </div>

      {/* Success banners */}
      {Object.entries(bagResults).map(([key, code]) => (
        <div key={key} className="bag-success-banner">
          <FiCheckCircle size={28} />
          <div>
            <strong>Tạo bao thành công!</strong>
            <div className="bag-code-big">{code}</div>
            <span>Dán mã này lên bao vật lý trước khi xuất kho.</span>
          </div>
          <button onClick={() => setBagResults(prev => { const next = {...prev}; delete next[key]; return next; })}>✕</button>
        </div>
      ))}

      {loading && (
        <div className="bagging-loading">
          <div className="spinner" /> Đang phân tích đơn hàng trong kho...
        </div>
      )}

      {!loading && groups.length === 0 && Object.keys(bagResults).length === 0 && (
        <div className="bagging-empty">
          <FiPackage size={56} />
          <h3>Không có đơn nào cần gom bao</h3>
          <p>Tất cả đơn hàng trong kho đã được xử lý hoặc chưa có đơn nào nhập kho.</p>
          <button className="btn-refresh" onClick={fetchSuggestions}>Làm mới</button>
        </div>
      )}

      <div className="bagging-groups">
        {groups.map(group => {
          const key = `${group.next_hop_type}_${group.next_hop_id}`;
          const isCreating = creatingFor === key;
          return (
            <div key={key} className={`bag-group-card ${group.next_hop_type === 'HUB' ? 'hub-type' : 'spoke-type'}`}>
              <div className="bag-group-header">
                <div className="bag-group-dest">
                  {group.next_hop_type === 'HUB' ? <FiTruck size={20} /> : <FiCornerDownRight size={20} />}
                  <div>
                    <span className="bag-hop-label">
                      {group.next_hop_type === 'HUB' ? 'Chuyển Hub Tổng' : 'Giao Bưu Cục'}
                    </span>
                    <strong className="bag-hop-name">{group.next_hop_name}</strong>
                  </div>
                </div>
                <div className="bag-group-count">
                  <span>{group.orders.length}</span>
                  <label>đơn hàng</label>
                </div>
              </div>

              <div className="bag-orders-list">
                {group.orders.map(order => (
                  <div key={order.id_order} className="bag-order-row">
                    <FiPackage size={14} />
                    <span className="bag-order-code">{order.tracking_code}</span>
                    <span className="bag-order-dest">{order.district}, {order.province}</span>
                    <span className="bag-order-time">{new Date(order.last_updated).toLocaleTimeString('vi-VN')}</span>
                  </div>
                ))}
              </div>

              <div className="bag-group-footer">
                <button
                  className="btn-create-bag"
                  onClick={() => handleCreateBag(group)}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <><div className="spinner-sm" /> Đang tạo bao...</>
                  ) : (
                    <><FiCheckCircle size={18} /> Gom {group.orders.length} đơn thành Bao</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Bagging;
