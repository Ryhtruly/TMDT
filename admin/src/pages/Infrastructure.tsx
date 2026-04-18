import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiServer, FiMapPin, FiMap, FiTrash2 } from 'react-icons/fi';
import apiClient from '../api/client';
import Drawer from '../components/ui/Drawer';
import './Infrastructure.css';

interface Hub {
  id_hub: number;
  hub_name: string;
  description: string;
}

interface SpokeArea {
  district: string;
  province: string;
  area_type: string;
}

interface Spoke {
  id_spoke: number;
  spoke_name: string;
  hub_name: string;
  id_hub: number;
  areas?: SpokeArea[];
}

const Infrastructure = () => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [spokes, setSpokes] = useState<Spoke[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hubs' | 'spokes' | 'areas'>('hubs');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'ADD_HUB' | 'ADD_SPOKE' | 'CONFIG_AREA' | 'EDIT_HUB' | 'EDIT_SPOKE' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Areas state
  const [areas, setAreas] = useState<any[]>([]);

  // Form States
  const [formData, setFormData] = useState({
    name: '', description: '', id_hub: '',
    address: '', latitude: '', longitude: '',
    province: '', district: '', area_type: 'NỘI THÀNH', id_spoke: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchInfrastructure();
  }, []);

  const fetchInfrastructure = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/infrastructure');
      if (res.data) {
        setHubs(res.data.hubs || []);
        setSpokes(res.data.spokes || []);
        setAreas(res.data.areas || []);
      }
    } catch (error) {
      console.error('Lỗi lấy hạ tầng:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (type: 'ADD_HUB' | 'ADD_SPOKE' | 'CONFIG_AREA') => {
    setDrawerType(type);
    setFormData({ name: '', description: '', id_hub: '', address: '', latitude: '', longitude: '', province: '', district: '', area_type: 'NỘI THÀNH', id_spoke: '' });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (type: 'EDIT_HUB' | 'EDIT_SPOKE', data: any) => {
    setDrawerType(type);
    if (type === 'EDIT_HUB') {
       setEditingId(data.id_hub);
       setFormData({ ...formData, name: data.hub_name, description: data.description || '' });
    } else {
       setEditingId(data.id_spoke);
       // API Update Spoke chỉ hỗ trợ đổi tên, id_hub không đổi
       setFormData({ ...formData, name: data.spoke_name, id_hub: String(data.id_hub) });
    }
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number, type: 'hub' | 'spoke') => {
    const confirmString = prompt(`XÁC NHẬN: Bạn đang chuẩn bị Giải thể Cơ sở ${type.toUpperCase()}-${id} ra khỏi hệ thống Logistics.\nGõ 'XOA' để thực thi lệnh cấm đảo ngược này.`);
    if (confirmString !== 'XOA') return;
    try {
      if (type === 'hub') {
        await apiClient.delete(`/admin/hubs/${id}`);
      } else {
        await apiClient.delete(`/admin/spokes/${id}`);
      }
      alert(`Đóng Cơ sở ${type.toUpperCase()}-${id} thành công!`);
      fetchInfrastructure();
    } catch (err: any) {
      alert(`[ CẢNH BÁO ] Lệnh Xóa Bị Chặn!\nLý do: ${err.response?.data?.message || 'Có rủi ro mất hàng. Vui lòng kiểm tra lại.'}`);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (drawerType === 'ADD_HUB') {
        await apiClient.post('/admin/hubs', {
          location_name: formData.name,
          description: formData.description,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        });
      } else if (drawerType === 'ADD_SPOKE') {
        await apiClient.post('/admin/spokes', {
          spoke_name: formData.name,
          location_name: formData.name,
          id_hub: parseInt(formData.id_hub),
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        });
      } else if (drawerType === 'CONFIG_AREA') {
        await apiClient.post('/admin/areas', {
           province: formData.province, 
           district: formData.district, 
           area_type: formData.area_type,
           id_spoke: parseInt(formData.id_spoke) || undefined
        });
      } else if (drawerType === 'EDIT_HUB' && editingId) {
        await apiClient.put(`/admin/hubs/${editingId}`, { hub_name: formData.name, description: formData.description });
      } else if (drawerType === 'EDIT_SPOKE' && editingId) {
        await apiClient.put(`/admin/spokes/${editingId}`, { spoke_name: formData.name });
      }
      alert('Thao tác thành công!');
      setIsDrawerOpen(false);
      fetchInfrastructure();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const renderDrawerContent = () => {
    if (drawerType === 'ADD_HUB' || drawerType === 'EDIT_HUB') {
      return (
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tên Hub / Kho Trung Tâm</label>
            <input type="text" required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Kho Tổng Củ Chi" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mô tả</label>
            <textarea rows={3} className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          {drawerType === 'ADD_HUB' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Địa chỉ đầy đủ</label>
                <input type="text" required className="form-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="VD: KCN Tân Phú Trung, Củ Chi, TP.HCM" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vĩ độ (Latitude)</label>
                  <input type="number" step="0.000001" required className="form-control" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} placeholder="10.9255" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Kinh độ (Longitude)</label>
                  <input type="number" step="0.000001" required className="form-control" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} placeholder="106.5361" />
                </div>
              </div>
            </>
          )}
          <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Đang lưu...' : (drawerType === 'ADD_HUB' ? 'Khởi tạo Hub mới' : 'Lưu Thay Đổi')}</button>
        </form>
      );
    }

    if (drawerType === 'ADD_SPOKE' || drawerType === 'EDIT_SPOKE') {
      return (
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tên Bưu Cục (Spoke)</label>
            <input type="text" required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Bưu cục Quận 1" />
          </div>
          {drawerType === 'ADD_SPOKE' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Trực thuộc Hub</label>
                <select required className="form-control" value={formData.id_hub} onChange={e => setFormData({...formData, id_hub: e.target.value})}>
                  <option value="">-- Chọn Hub Chủ Quản --</option>
                  {hubs.map(h => <option key={h.id_hub} value={h.id_hub}>{h.hub_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Địa chỉ đầy đủ</label>
                <input type="text" required className="form-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="VD: 112 Trần Đình Xu, Q1, TP.HCM" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vĩ độ (Latitude)</label>
                  <input type="number" step="0.000001" required className="form-control" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Kinh độ (Longitude)</label>
                  <input type="number" step="0.000001" required className="form-control" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                </div>
              </div>
            </>
          )}
          {drawerType === 'EDIT_SPOKE' && (
             <div style={{ backgroundColor: '#fff3ec', padding: '15px', borderRadius: '8px', color: '#F26522', fontSize: '0.9rem' }}>
                <strong>Lưu ý:</strong> Vị trí HUB quản lý không thể di dời qua API này. Bạn chỉ có thể đổi tên mạng lưới bưu cục.
             </div>
          )}
          <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Đang lưu...' : (drawerType === 'ADD_SPOKE' ? 'Mở Bưu cục mới' : 'Lưu Thay Đổi')}</button>
        </form>
      );
    }

    if (drawerType === 'CONFIG_AREA') {
      return (
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff3ec', padding: '15px', borderRadius: '8px', color: '#F26522', fontSize: '0.9rem' }}>
            Logic: Nối Vùng (Tỉnh/Huyện) với Bưu Cục (Spoke). Từ đó Bưu cục sẽ đứng ra thu phát hàng cho khu vực này.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tỉnh / Thành Phố</label>
              <input type="text" required placeholder="Hồ Chí Minh" className="form-control" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Quận / Huyện</label>
              <input type="text" required placeholder="Quận 1" className="form-control" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
            </div>
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Loại Tuyến Phí</label>
             <select required className="form-control" value={formData.area_type} onChange={e => setFormData({...formData, area_type: e.target.value})}>
                <option value="NỘI THÀNH">NỘI THÀNH</option>
                <option value="NGOẠI THÀNH">NGOẠI THÀNH</option>
             </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Khóa trách nhiệm tự động về Bưu cục (Spoke ID)</label>
            <select required className="form-control" value={formData.id_spoke} onChange={e => setFormData({...formData, id_spoke: e.target.value})}>
              <option value="">-- Chọn Bưu Cục Phụ Trách --</option>
              {spokes.map(s => <option key={s.id_spoke} value={s.id_spoke}>{s.spoke_name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Đang lưu...' : 'Thiết Lập Vùng (Area)'}</button>
        </form>
      );
    }
    return null;
  };

  return (
    <div className="infrastructure-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Quản Lý Hạ Tầng Mạng Lưới</h1>
          <p className="page-subtitle">Sắp xếp Kho Trung Tâm (Hub) và Bưu Cục (Spoke)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary flex-center gap-2" style={{ backgroundColor: 'white', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }} onClick={() => openDrawer('CONFIG_AREA')}>
            <FiMap /> Bản đồ Phân Vùng
          </button>
          <button className="btn-primary flex-center gap-2" onClick={() => openDrawer(activeTab === 'hubs' ? 'ADD_HUB' : 'ADD_SPOKE')}>
            <FiPlus /> Mở Rộng Cơ Sở
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'hubs' ? 'active' : ''}`} onClick={() => setActiveTab('hubs')}>
            <FiServer className="tab-icon" /> Kho Điểm Hub ({hubs.length})
          </button>
          <button className={`tab-btn ${activeTab === 'spokes' ? 'active' : ''}`} onClick={() => setActiveTab('spokes')}>
            <FiMapPin className="tab-icon" /> Bưu Cục Spoke ({spokes.length})
          </button>
          <button className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => setActiveTab('areas')}>
            <FiMap className="tab-icon" /> Phân Vùng ({areas.length})
          </button>
        </div>

        <div className="table-container">
          {activeTab === 'areas' ? (
            <table className="admin-table">
              <thead><tr>
                <th>ID</th><th>Tỉnh/Thành</th><th>Quận/Huyện</th><th>Loại</th><th>Bưu cục phụ trách</th>
              </tr></thead>
              <tbody>
                {areas.map((a: any) => (
                  <tr key={a.id_area}>
                    <td><span className="badge-id">AREA-{a.id_area}</span></td>
                    <td className="font-medium">{a.province}</td>
                    <td>{a.district}</td>
                    <td><span style={{ backgroundColor: a.area_type === 'NỘI THÀNH' ? '#dbeafe' : '#fef9c3', color: a.area_type === 'NỘI THÀNH' ? '#1d4ed8' : '#854d0e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>{a.area_type}</span></td>
                    <td>{a.spoke_name || `Spoke-${a.id_spoke}`}</td>
                  </tr>
                ))}
                {areas.length === 0 && <tr><td colSpan={5} className="empty-state">Chưa có phân vùng nào.</td></tr>}
              </tbody>
            </table>
          ) : loading ? (
            <div className="loading-state">Đang trích xuất dữ liệu kho...</div>
          ) : (
            <table className="admin-table">
              <thead>
                {activeTab === 'hubs' ? (
                  <tr>
                    <th style={{ width: '10%' }}>ID</th>
                    <th style={{ width: '30%' }}>Tên Hub</th>
                    <th style={{ width: '45%' }}>Mô tả / Khu vực</th>
                    <th style={{ width: '15%' }} className="text-right">Thao tác</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: '8%' }}>ID</th>
                    <th style={{ width: '22%' }}>Tên Bưu Cục (Spoke)</th>
                    <th style={{ width: '22%' }}>Thuộc Hub Quản Lý</th>
                    <th style={{ width: '36%' }}>Khu Vực Phụ Trách</th>
                    <th style={{ width: '12%' }} className="text-right">Thao tác</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'hubs' && hubs.length > 0 && hubs.map((hub) => (
                  <tr key={hub.id_hub}>
                    <td><span className="badge-id">HUB-{hub.id_hub}</span></td>
                    <td className="font-medium">{hub.hub_name}</td>
                    <td className="text-muted">
                      <div style={{ marginBottom: '8px' }}>{hub.description || 'Chưa cập nhật'}</div>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: 'var(--slate-600)' }}>Quản lý Bưu Cục: </strong>
                        {spokes.filter(s => s.id_hub === hub.id_hub).map(s => (
                          <span key={s.id_spoke} style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', display: 'inline-block', marginBottom: '4px' }}>SPK-{s.id_spoke}: {s.spoke_name}</span>
                        ))}
                        {spokes.filter(s => s.id_hub === hub.id_hub).length === 0 && <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Chưa có Spoke</span>}
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="action-btn text-primary" onClick={() => openEditDrawer('EDIT_HUB', hub)} style={{ marginRight: '8px' }}><FiEdit2 /></button>
                      <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(hub.id_hub, 'hub')} title="Đóng cửa / Xóa"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
                
                {activeTab === 'spokes' && spokes.length > 0 && spokes.map((spoke) => (
                  <tr key={spoke.id_spoke}>
                    <td><span className="badge-id">SPK-{spoke.id_spoke}</span></td>
                    <td className="font-medium">{spoke.spoke_name}</td>
                    <td><span className="badge-hub">{spoke.hub_name}</span></td>
                    <td>
                      {spoke.areas && spoke.areas.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {spoke.areas.map((a, i) => (
                            <span key={i} style={{
                              backgroundColor: a.area_type === 'NỘI THÀNH' ? '#dbeafe' : '#fef9c3',
                              color: a.area_type === 'NỘI THÀNH' ? '#1d4ed8' : '#854d0e',
                              padding: '2px 7px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {a.district}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa phân vùng</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button className="action-btn text-primary" onClick={() => openEditDrawer('EDIT_SPOKE', spoke)} style={{ marginRight: '8px' }}><FiEdit2 /></button>
                      <button className="action-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(spoke.id_spoke, 'spoke')} title="Đóng cửa / Xóa"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}

                {(activeTab === 'hubs' && hubs.length === 0) || (activeTab === 'spokes' && spokes.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      Chưa có dữ liệu cơ sở hạ tầng nào.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        title={
          drawerType === 'ADD_HUB' ? 'Khởi tạo Hub mới' :
          drawerType === 'ADD_SPOKE' ? 'Mở rộng Spoke mới' :
          'Bản đồ Phân Vùng (Areas)'
        }
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
};

export default Infrastructure;
