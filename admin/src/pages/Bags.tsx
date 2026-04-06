import { useState, useEffect } from 'react';
import { FiBox, FiPlus, FiSearch, FiCheckCircle, FiPackage } from 'react-icons/fi';
import apiClient from '../api/client';
import Drawer from '../components/ui/Drawer';

const statusColors: Record<string, { bg: string; color: string }> = {
  OPEN:       { bg: '#dbeafe', color: '#1d4ed8' },
  SEALED:     { bg: '#fef9c3', color: '#854d0e' },
  IN_TRANSIT: { bg: '#fff7ed', color: '#c2410c' },
  RECEIVED:   { bg: '#d1fae5', color: '#047857' },
};

const Bags = () => {
  const [bags, setBags] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [selectedBag, setSelectedBag] = useState<any>(null);

  const [createForm, setCreateForm] = useState({ origin_hub_id: '', dest_hub_id: '', order_ids: '' });
  const [scanForm, setScanForm] = useState({ bag_code: '', action: 'SEAL' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchBags();
    fetchHubs();
  }, []);

  const fetchBags = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/bags');
      setBags(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHubs = async () => {
    try {
      const res = await apiClient.get('/admin/infrastructure');
      setHubs(res.data?.hubs || []);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const order_ids = createForm.order_ids
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n));
      await apiClient.post('/bags', {
        origin_hub_id: parseInt(createForm.origin_hub_id),
        dest_hub_id: parseInt(createForm.dest_hub_id),
        order_ids,
      });
      alert('Tạo bao kiện thành công!');
      setIsCreateOpen(false);
      setCreateForm({ origin_hub_id: '', dest_hub_id: '', order_ids: '' });
      fetchBags();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await apiClient.post('/bags/scan', scanForm);
      alert(`✅ ${res.data?.message || 'Đã xử lý bao kiện!'}`);
      setIsScanOpen(false);
      fetchBags();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetail = async (bag_code: string) => {
    try {
      const res = await apiClient.get(`/bags/${bag_code}`);
      setSelectedBag(res.data);
    } catch (err: any) {
      alert('Không tìm thấy thông tin bao: ' + err.response?.data?.message);
    }
  };

  const filtered = bags.filter(b =>
    b.bag_code?.toLowerCase().includes(searchText.toLowerCase()) ||
    b.origin_hub_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    b.status?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="bags-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Điều Phối Bao Kiện</h1>
          <p className="page-subtitle">Quản lý đóng gói và trung chuyển hàng hóa giữa các Hub.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary flex-center gap-2"
            style={{ backgroundColor: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
            onClick={() => setIsScanOpen(true)}>
            <FiCheckCircle /> Scan / Đóng Seal
          </button>
          <button className="btn-primary flex-center gap-2" onClick={() => setIsCreateOpen(true)}>
            <FiPlus /> Tạo Bao Mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        {Object.entries(statusColors).map(([status, style]) => (
          <div key={status} className="stat-card">
            <div className="stat-card-top">
              <h3 className="stat-title">{status}</h3>
              <div className="stat-icon-soft" style={{ backgroundColor: style.bg, color: style.color }}><FiBox /></div>
            </div>
            <div className="stat-card-body">
              <div className="stat-value">{bags.filter(b => b.status === status).length}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" className="form-control" placeholder="Tìm mã bao, hub..."
              style={{ paddingLeft: '36px' }}
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{filtered.length} bao kiện</span>
        </div>

        <div className="table-container">
          {loading ? <div className="loading-state">Đang tải danh sách bao kiện...</div> : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Mã Bao</th>
                  <th style={{ width: '25%' }}>Hub Xuất phát</th>
                  <th style={{ width: '25%' }}>Hub Đích</th>
                  <th style={{ width: '10%' }}>Số ĐH</th>
                  <th style={{ width: '15%' }}>Trạng thái</th>
                  <th style={{ width: '10%' }} className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bag => {
                  const s = statusColors[bag.status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={bag.id_bag}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                          {bag.bag_code}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🏭 {bag.origin_hub_name || `Hub-${bag.origin_hub_id}`}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🏭 {bag.dest_hub_name || `Hub-${bag.dest_hub_id}`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {bag.item_count || 0}
                      </td>
                      <td>
                        <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {bag.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="action-btn text-primary"
                          onClick={() => handleViewDetail(bag.bag_code)}
                          title="Xem chi tiết bao">
                          <FiPackage />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">Chưa có bao kiện nào trong hệ thống.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedBag && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setSelectedBag(null)}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Chi tiết Bao: {selectedBag.bag_code}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <p><strong>Trạng thái:</strong> {selectedBag.status}</p>
              <p><strong>Hub xuất:</strong> {selectedBag.origin_hub_id}</p>
              <p><strong>Hub đích:</strong> {selectedBag.dest_hub_id}</p>
              <p><strong>Số đơn hàng:</strong> {selectedBag.orders?.length || 0}</p>
              {selectedBag.orders?.length > 0 && (
                <div>
                  <strong>Danh sách vận đơn:</strong>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedBag.orders.map((o: any) => (
                      <span key={o.tracking_code} style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {o.tracking_code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="btn-primary" style={{ marginTop: '20px', width: '100%' }} onClick={() => setSelectedBag(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Create Bag Drawer */}
      <Drawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tạo Bao Kiện Mới">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff3ec', padding: '12px', borderRadius: '8px', color: '#F26522', fontSize: '0.85rem' }}>
            Bao kiện sẽ tự động tạo mã BAG_xxx và ở trạng thái OPEN cho đến khi Đóng Seal.
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hub Xuất Phát</label>
            <select required className="form-control" value={createForm.origin_hub_id}
              onChange={e => setCreateForm({ ...createForm, origin_hub_id: e.target.value })}>
              <option value="">-- Chọn Hub --</option>
              {hubs.map(h => <option key={h.id_hub} value={h.id_hub}>{h.hub_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hub Đích</label>
            <select required className="form-control" value={createForm.dest_hub_id}
              onChange={e => setCreateForm({ ...createForm, dest_hub_id: e.target.value })}>
              <option value="">-- Chọn Hub --</option>
              {hubs.map(h => <option key={h.id_hub} value={h.id_hub}>{h.hub_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              ID Đơn Hàng (phân cách bằng dấu phẩy)
            </label>
            <textarea rows={3} className="form-control" placeholder="VD: 1, 2, 5, 8" value={createForm.order_ids}
              onChange={e => setCreateForm({ ...createForm, order_ids: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang tạo...' : '📦 Tạo Bao Kiện'}
          </button>
        </form>
      </Drawer>

      {/* Scan Drawer */}
      <Drawer isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} title="Scan Bao Kiện">
        <form onSubmit={handleScan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mã Bao Kiện</label>
            <input type="text" required className="form-control" placeholder="VD: BAG_HN_001" value={scanForm.bag_code}
              onChange={e => setScanForm({ ...scanForm, bag_code: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hành động</label>
            <select required className="form-control" value={scanForm.action}
              onChange={e => setScanForm({ ...scanForm, action: e.target.value })}>
              <option value="SEAL">SEAL — Đóng niêm phong</option>
              <option value="DISPATCH">DISPATCH — Xuất kho / Giao xe</option>
              <option value="RECEIVE">RECEIVE — Nhận tại Hub đích</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={formLoading}>
            {formLoading ? 'Đang xử lý...' : '🔍 Xác Nhận Scan'}
          </button>
        </form>
      </Drawer>
    </div>
  );
};

export default Bags;
