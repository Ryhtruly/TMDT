import { useState, useEffect } from 'react';
import { FiMapPin, FiPhone, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import apiClient from '../../api/client';
import { isValidVietnamPhone, normalizeVietnamPhone, vietnamPhoneError } from '../../utils/phone';
import './Stores.css';

type SupportedDistrict = {
  name: string;
};

type SupportedProvince = {
  name: string;
  districts: SupportedDistrict[];
};

type ProvinceApiItem = {
  code: number;
  name: string;
};

type DistrictApiItem = {
  code: number;
  name: string;
};

type WardApiItem = {
  code: number;
  name: string;
};

const normalizeLocationText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeProvinceName = (value: string) =>
  normalizeLocationText(value).replace(/^(thanh pho|tp|tinh)\s*/, '');

const normalizeDistrictName = (value: string) =>
  normalizeLocationText(value)
    .replace(/^(quan|q)\s*/, '')
    .replace(/^(huyen|h)\s*/, '')
    .replace(/^(thi xa|tx)\s*/, '')
    .replace(/^(thi tran|tt)\s*/, '')
    .replace(/^(thanh pho|tp)\s*/, '')
    .trim();

const isSameProvince = (a: string, b: string) => normalizeProvinceName(a) === normalizeProvinceName(b);
const isSameDistrict = (a: string, b: string) => normalizeDistrictName(a) === normalizeDistrictName(b);

const Stores = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ store_name: '', phone: '', address: '', description: '' });

  // Address Modal States
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [supportedProvinces, setSupportedProvinces] = useState<SupportedProvince[]>([]);
  const [provinceCatalog, setProvinceCatalog] = useState<ProvinceApiItem[]>([]);
  const [districts, setDistricts] = useState<DistrictApiItem[]>([]);
  const [wards, setWards] = useState<WardApiItem[]>([]);
  
  const [selectedProv, setSelectedProv] = useState<SupportedProvince | null>(null);
  const [selectedDist, setSelectedDist] = useState<DistrictApiItem | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardApiItem | null>(null);
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

  const findProvinceApi = (provinceName: string) =>
    provinceCatalog.find((item) => isSameProvince(item.name, provinceName)) || null;

  const loadSupportedDistricts = async (province: SupportedProvince) => {
    const provinceApi = findProvinceApi(province.name);
    if (!provinceApi) {
      setDistricts([]);
      return [];
    }

    const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceApi.code}?depth=2`);
    const data = await res.json();
    const filteredDistricts = (data.districts || []).filter((district: DistrictApiItem) =>
      province.districts.some((item) => isSameDistrict(item.name, district.name))
    );
    setDistricts(filteredDistricts);
    return filteredDistricts;
  };

  const loadWardsForDistrict = async (district: DistrictApiItem) => {
    const res = await fetch(`https://provinces.open-api.vn/api/d/${district.code}?depth=2`);
    const data = await res.json();
    const nextWards = data.wards || [];
    setWards(nextWards);
    return nextWards;
  };

  useEffect(() => {
    fetchStores();
    apiClient.get('/shop/areas/supported')
      .then((res: any) => {
        if (res?.status === 'success') setSupportedProvinces(res.data || []);
      })
      .catch(console.error);
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinceCatalog(data))
      .catch(console.error);
  }, []);

  const handleProvChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = supportedProvinces.find((item) => item.name === e.target.value) || null;
    setSelectedProv(prov);
    setSelectedDist(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    if (!prov) return;
    await loadSupportedDistricts(prov);
  };

  const handleDistChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const dist = districts.find(d => String(d.code) === code) || null;
    setSelectedDist(dist);
    setSelectedWard(null);
    setWards([]);
    if (!dist) return;
    await loadWardsForDistrict(dist);
  };

  const openAddressModalWithData = async () => {
    setShowAddressModal(true);
    const addressStr = formData.address || '';
    if (!addressStr) {
      setSelectedProv(null); setSelectedDist(null); setSelectedWard(null); setDistricts([]); setWards([]); setStreetNum('');
      return;
    }
    const parts = addressStr.split(', ');
    if (parts.length >= 4) {
      const pName = parts[parts.length - 1];
      const dName = parts[parts.length - 2];
      const wName = parts[parts.length - 3];
      const sNum = parts.slice(0, parts.length - 3).join(', ');
      
      const prov = supportedProvinces.find((p) => isSameProvince(p.name, pName)) || null;
      if (prov) {
        setSelectedProv(prov);
        const nextDistricts = await loadSupportedDistricts(prov);
        
        const dist = nextDistricts.find((d: DistrictApiItem) => isSameDistrict(d.name, dName)) || null;
        if (dist) {
          setSelectedDist(dist);
          const nextWards = await loadWardsForDistrict(dist);
          
          const ward = nextWards.find((w: WardApiItem) => w.name === wName) || null;
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
    const normalizedPhone = normalizeVietnamPhone(formData.phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      alert(vietnamPhoneError);
      return;
    }
    const payload = { ...formData, phone: normalizedPhone };
    try {
      if (editStoreId) {
        await apiClient.put(`/shop/stores/${editStoreId}`, payload);
        alert('Cập nhật kho hàng thành công!');
      } else {
        await apiClient.post('/shop/stores', payload);
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
               <select className="form-control" value={selectedProv?.name || ''} onChange={handleProvChange}>
                 <option value="">Chọn Tỉnh/Thành phố</option>
                 {supportedProvinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
               </select>
               <select className="form-control" value={selectedDist?.code || ''} onChange={handleDistChange} disabled={!selectedProv}>
                 <option value="">Chọn Quận/Huyện</option>
                 {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
               </select>
               <select className="form-control" value={selectedWard?.code || ''} onChange={e => setSelectedWard(wards.find(w => String(w.code) === e.target.value) || null)} disabled={!selectedDist}>
                 <option value="">Chọn Phường/Xã</option>
                 {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
               </select>
               <input type="text" className="form-control" value={streetNum} onChange={e => setStreetNum(e.target.value)} placeholder="Nhập số nhà, tên đường..." disabled={!selectedWard} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '12px' }}>
              Chỉ hiện các tỉnh/thành và quận/huyện đã được cấu hình giao hàng trong hệ thống.
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
