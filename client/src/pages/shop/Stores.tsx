import { useState, useEffect } from 'react';
import { FiMapPin, FiPhone, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Stores.css';

const Stores = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ store_name: '', phone: '', address: '', description: '' });

  // Address Modal States
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProv, setSelectedProv] = useState<any>(null);
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [streetNum, setStreetNum] = useState('');

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/shop/stores') as any;
      if (res?.status === 'success') {
        setStores(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);
  }, []);

  const handleProvChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const prov = provinces.find(p => p.code == code);
    setSelectedProv(prov);
    setSelectedDist(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    if (!code) return;
    const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
    const data = await res.json();
    setDistricts(data.districts || []);
  };

  const handleDistChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const dist = districts.find(d => d.code == code);
    setSelectedDist(dist);
    setSelectedWard(null);
    setWards([]);
    if (!code) return;
    const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
    const data = await res.json();
    setWards(data.wards || []);
  };

  const openAddressModalWithData = async () => {
    setShowAddressModal(true);
    const addressStr = formData.address || '';
    if (!addressStr) {
      setSelectedProv(null); setSelectedDist(null); setSelectedWard(null); setStreetNum('');
      return;
    }
    const parts = addressStr.split(', ');
    if (parts.length >= 4) {
      const pName = parts[parts.length - 1];
      const dName = parts[parts.length - 2];
      const wName = parts[parts.length - 3];
      const sNum = parts.slice(0, parts.length - 3).join(', ');
      
      const prov = provinces.find(p => p.name === pName);
      if (prov) {
        setSelectedProv(prov);
        const repD = await fetch(`https://provinces.open-api.vn/api/p/${prov.code}?depth=2`);
        const datD = await repD.json();
        setDistricts(datD.districts || []);
        
        const dist = (datD.districts || []).find((d: any) => d.name === dName);
        if (dist) {
          setSelectedDist(dist);
          const repW = await fetch(`https://provinces.open-api.vn/api/d/${dist.code}?depth=2`);
          const datW = await repW.json();
          setWards(datW.wards || []);
          
          const ward = (datW.wards || []).find((w: any) => w.name === wName);
          if (ward) {
            setSelectedWard(ward);
            setStreetNum(sNum);
            return;
          }
        }
      }
    }
    setSelectedProv(null); setSelectedDist(null); setSelectedWard(null); setDistricts([]); setWards([]); setStreetNum(addressStr);
  };

  const saveAddress = () => {
    if (!selectedProv || !selectedDist || !selectedWard || !streetNum) {
      return alert('Vui lòng nhập đầy đủ thông tin địa chỉ!');
    }
    const fullAddress = `${streetNum}, ${selectedWard.name}, ${selectedDist.name}, ${selectedProv.name}`;
    setFormData({...formData, address: fullAddress});
    setShowAddressModal(false);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editStoreId) {
        await apiClient.put(`/shop/stores/${editStoreId}`, formData);
        alert('Cập nhật kho hàng thành công!');
      } else {
        await apiClient.post('/shop/stores', formData);
        alert('Thêm kho hàng mới thành công!');
      }
      setShowModal(false);
      setEditStoreId(null);
      setFormData({ store_name: '', phone: '', address: '', description: '' });
      fetchStores();
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu kho.');
    }
  };

  const openEditModal = (store: any) => {
    setEditStoreId(store.id_store);
    setFormData({
      store_name: store.store_name || '',
      phone: store.phone || '',
      address: store.address || '',
      description: store.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa kho lấy hàng này?')) return;
    try {
      await apiClient.delete(`/shop/stores/${id}`);
      fetchStores();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa kho khi vướng đơn hàng.');
    }
  };

  return (
    <div className="stores-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Kho Lấy Hàng</h1>
          <p style={{color: 'var(--slate-500)', marginTop: '8px'}}>Địa chỉ để Shipper đến lấy hàng mang đi điều phối.</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditStoreId(null);
          setFormData({ store_name: '', phone: '', address: '', description: '' });
          setShowModal(true);
        }}>
          <FiPlus /> Thêm Kho Mới
        </button>
      </div>

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="stores-grid">
          {stores.map(store => (
            <div key={store.id_store} className="store-card">
              <div className="store-header">
                <div className="store-icon"><FiMapPin /></div>
                <div className="store-name">{store.store_name}</div>
              </div>
              <div className="store-detail">
                <div className="detail-row">
                  <FiPhone className="detail-icon" /> {store.phone}
                </div>
                <div className="detail-row">
                  <FiMapPin className="detail-icon" /> {store.address}
                </div>
                {store.description && (
                  <div className="detail-row" style={{fontStyle: 'italic', opacity: 0.8}}>
                    Ghi chú: {store.description}
                  </div>
                )}
              </div>
              <div className="store-actions">
                <button className="btn-outline" style={{padding: '6px 12px', fontSize: '13px', marginRight: '8px', color: 'var(--primary-color)'}} onClick={() => openEditModal(store)}>
                   <FiEdit2 /> Sửa
                </button>
                <button className="btn-outline" style={{padding: '6px 12px', fontSize: '13px'}} onClick={() => handleDelete(store.id_store)}>
                   <FiTrash2 /> Xóa
                </button>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
             <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px'}}>
                Chưa có cấu hình kho lấy hàng nào. Hãy thêm kho đầu tiên!
             </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editStoreId ? 'Sửa Kho Lấy Hàng' : 'Thêm Kho Lấy Hàng'}</h2>
            <form onSubmit={handleSaveStore}>
              <div className="form-group">
                <label>Tên Gợi Nhớ (VD: Kho HCM)</label>
                <input required type="text" className="form-control" value={formData.store_name} onChange={e => setFormData({...formData, store_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>SĐT Liên Hệ Lấy Hàng</label>
                <input required type="text" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Địa Chỉ Lấy Hàng Cụ Thể</label>
                <div style={{position: 'relative', cursor: 'pointer'}} onClick={openAddressModalWithData}>
                  <input required type="text" className="form-control" value={formData.address} onChange={() => {}} readOnly style={{cursor: 'pointer'}} placeholder="Click để chọn địa chỉ" />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú (Tùy chọn)</label>
                <input type="text" className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu Kho Mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h2 className="modal-title" style={{margin: 0}}>Chọn địa chỉ</h2>
              <button type="button" onClick={() => setShowAddressModal(false)} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>&times;</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px'}}>
               <select className="form-control" value={selectedProv?.code || ''} onChange={handleProvChange}>
                 <option value="">Chọn Tỉnh/Thành phố</option>
                 {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
               </select>
               <select className="form-control" value={selectedDist?.code || ''} onChange={handleDistChange} disabled={!selectedProv}>
                 <option value="">Chọn Quận/Huyện</option>
                 {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
               </select>
               <select className="form-control" value={selectedWard?.code || ''} onChange={e => setSelectedWard(wards.find(w=>w.code==e.target.value))} disabled={!selectedDist}>
                 <option value="">Chọn Phường/Xã</option>
                 {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
               </select>
               <input type="text" className="form-control" value={streetNum} onChange={e => setStreetNum(e.target.value)} placeholder="Nhập số nhà, tên đường..." disabled={!selectedWard} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setShowAddressModal(false)}>Hủy</button>
              <button type="button" className="btn-primary" onClick={saveAddress}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
