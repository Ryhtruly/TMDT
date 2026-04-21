import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { FiPackage, FiCheckCircle, FiTruck, FiBox, FiCornerDownRight, FiRefreshCw, FiCopy } from 'react-icons/fi';
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

interface BagSummary {
  id_bag: number;
  bag_code: string;
  origin_hub_name: string;
  dest_hub_name: string;
  dest_spoke_name?: string | null;
  status: string;
  item_count: number;
  items: Array<{
    id_order: number;
    tracking_code: string;
    receiver_name: string;
    status: string;
    province: string;
    district: string;
  }>;
}

const normalizeGroups = (value: any): BagGroup[] =>
  Array.isArray(value)
    ? value
        .map((group: any) => ({
          ...group,
          orders: Array.isArray(group.orders) ? group.orders : [],
        }))
        .filter((group: BagGroup) => group.next_hop_id && group.next_hop_type !== 'UNKNOWN' && group.orders.length > 0)
    : [];

const Bagging = () => {
  const [groups, setGroups] = useState<BagGroup[]>([]);
  const [bags, setBags] = useState<BagSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [bagsLoading, setBagsLoading] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null); // key of group being bagged
  const [bagResults, setBagResults] = useState<Record<string, string>>({}); // key → bag_code

  const [expandedBag, setExpandedBag] = useState<string | null>(null);

  const copyBagCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`Da copy ma bao: ${code}`);
    } catch {
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert(`Da copy ma bao: ${code}`);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/stockkeeper/bags/suggestions');
      setGroups(normalizeGroups(res.data));
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBags = async () => {
    try {
      setBagsLoading(true);
      const res: any = await api.get('/stockkeeper/bags');
      setBags(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setBagsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    fetchBags();
  }, []);

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
      fetchBags();
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
          <button className="bag-copy-btn" onClick={() => copyBagCode(code)} title="Copy ma bao">
            <FiCopy size={18} />
          </button>
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

      <div className="bags-history">
        <div className="bags-history-header">
          <div>
            <h2>Bao da gom</h2>
            <p>Quet ma bao o man hinh Xuat Kho de xuat ca bao. Mo bao de xem cac don ben trong.</p>
          </div>
          <button className="btn-refresh" onClick={fetchBags} disabled={bagsLoading}>
            <FiRefreshCw size={16} /> {bagsLoading ? 'Dang tai...' : 'Lam moi'}
          </button>
        </div>

        {!bagsLoading && bags.length === 0 && (
          <div className="bags-history-empty">Chua co bao nao lien quan den kho nay.</div>
        )}

        <div className="bags-history-list">
          {bags.map((bag) => {
            const isOpen = expandedBag === bag.bag_code;
            const destination = bag.dest_spoke_name || bag.dest_hub_name || 'Chua xac dinh';
            return (
              <div key={bag.id_bag} className="bag-history-card">
                <button className="bag-history-main" onClick={() => setExpandedBag(isOpen ? null : bag.bag_code)}>
                  <div>
                    <span className="bag-history-code">{bag.bag_code}</span>
                    <span className={`bag-status ${bag.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{bag.status}</span>
                  </div>
                  <div className="bag-history-route">
                    <span>{bag.origin_hub_name || 'Kho nguon'}</span>
                    <FiCornerDownRight size={16} />
                    <strong>{destination}</strong>
                  </div>
                  <div className="bag-history-count">{bag.item_count} don</div>
                </button>
                <button className="bag-history-copy" onClick={() => copyBagCode(bag.bag_code)} title="Copy ma bao">
                  <FiCopy size={16} /> Copy
                </button>

                {isOpen && (
                  <div className="bag-history-items">
                    {bag.items.map((item) => (
                      <div key={item.id_order} className="bag-history-item">
                        <FiPackage size={14} />
                        <span className="bag-order-code">{item.tracking_code}</span>
                        <span>{item.receiver_name}</span>
                        <span className="bag-order-dest">{item.district}, {item.province}</span>
                        <span className="bag-item-status">{item.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Bagging;
