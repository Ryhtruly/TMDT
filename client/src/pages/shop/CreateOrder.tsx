import { useState, useEffect } from 'react';
import { FiChevronRight, FiImage, FiBox, FiPhone } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './CreateOrder.css';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramType = searchParams.get('type') || '1'; // 1: nhe, 2: nang
  
  const [stores, setStores] = useState<any[]>([]);
  const [spokes, setSpokes] = useState<any[]>([]);
  
  // Address Modal States
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<'RECEIVER'|'SENDER'|null>(null);
  
  // Store Selector Modal
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProv, setSelectedProv] = useState<any>(null);
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [streetNum, setStreetNum] = useState('');

  const [pickupType, setPickupType] = useState('TAN_NOI');
  const [pickupShift, setPickupShift] = useState('');
  const [dropoffSpokeId, setDropoffSpokeId] = useState('');

  const [formData, setFormData] = useState({
    id_store: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    id_service_type: Number(paramType), // 1: Nhe, 2: Nang
    weight: paramType === '2' ? 20000 : 200,
    item_value: 0,
    cod_amount: 0,
    length: 10,
    width: 10,
    height: 10,
    note: ''
  });

  const [previewFee, setPreviewFee] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await apiClient.get('/shop/stores') as any;
      if (res?.status === 'success' && res.data.length > 0) {
        setStores(res.data);
        const defaultId = localStorage.getItem('default_store');
        if (defaultId && res.data.some((s: any) => String(s.id_store) === defaultId)) {
          setFormData(prev => ({...prev, id_store: defaultId}));
        } else {
          setFormData(prev => ({...prev, id_store: res.data[0].id_store}));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStores();

    // Fetch Spokes from backend
    apiClient.get('/shop/spokes').then((res: any) => {
      if (res?.status === 'success') {
        setSpokes(res.data);
      }
    }).catch(console.error);

    // Fetch Provinces for Address Modal
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);

    // Listener sync default_store
    const handleStoreSync = () => {
      const defaultId = localStorage.getItem('default_store');
      if (defaultId) {
        setFormData(prev => ({...prev, id_store: defaultId}));
      }
    };
    window.addEventListener('default_store_changed', handleStoreSync);
    return () => window.removeEventListener('default_store_changed', handleStoreSync);
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

  const openAddressModalWithData = async (type: 'RECEIVER' | 'SENDER') => {
    setAddressModalType(type);
    setShowAddressModal(true);
    
    let addressStr = '';
    if (type === 'SENDER') {
      addressStr = getActiveStore()?.address || '';
    } else {
      addressStr = formData.receiver_address || '';
    }

    if (!addressStr) {
      setSelectedProv(null); setSelectedDist(null); setSelectedWard(null); setStreetNum('');
      return;
    }
    
    // Parse format: "street, ward, district, province"
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
    // Fallback if parsing fails or parts don't strictly match
    setSelectedProv(null);
    setSelectedDist(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setStreetNum(addressStr);
  };

  const saveAddress = async () => {
    if (!selectedProv || !selectedDist || !selectedWard || !streetNum) {
      return alert('Vui lòng nhập đầy đủ thông tin địa chỉ!');
    }
    const fullAddress = `${streetNum}, ${selectedWard.name}, ${selectedDist.name}, ${selectedProv.name}`;
    
    if (addressModalType === 'RECEIVER') {
      setFormData({...formData, receiver_address: fullAddress});
      setShowAddressModal(false);
      setAddressModalType(null);
    } else if (addressModalType === 'SENDER') {
      const store = getActiveStore();
      if (!store) return;
      try {
        await apiClient.put(`/shop/stores/${store.id_store}`, {
          ...store,
          address: fullAddress
        });
        alert('Cập nhật địa chỉ kho thành công!');
        fetchStores(); // Reload stores so UI gets updated address
        setShowAddressModal(false);
        setAddressModalType(null);
      } catch (err) {
        alert('Lỗi khi cập nhật kho');
      }
    }
  };

  const handleSelectAnotherStore = (id: string) => {
    setFormData({...formData, id_store: id});
    localStorage.setItem('default_store', id);
    window.dispatchEvent(new Event('default_store_changed'));
    setShowStoreSelector(false);
  };

  useEffect(() => {
    const getPreview = async () => {
      if (!formData.id_service_type || !formData.weight) return;
      setLoadingPreview(true);
      try {
        const payload = {
          id_service_type: Number(formData.id_service_type),
          weight: Number(formData.weight),
          item_value: Number(formData.item_value || 0)
        };
        const res = await apiClient.post('/orders/preview-fee', payload) as any;
        if (res?.status === 'success') {
          setPreviewFee(res.feeDetail);
        }
      } catch (err) {
        setPreviewFee(null);
      } finally {
        setLoadingPreview(false);
      }
    };
    const timer = setTimeout(getPreview, 500);
    return () => clearTimeout(timer);
  }, [formData.id_service_type, formData.weight, formData.item_value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_store) return alert('Vui lòng tạo kho gửi hàng trước!');
    try {
      setLoadingSubmit(true);
      await apiClient.post('/orders', {
        ...formData,
        id_store: Number(formData.id_store),
        id_service_type: Number(formData.id_service_type),
        weight: Number(formData.weight),
        pickup_shift: pickupShift || 'Ca mặc định',
        dropoff_spoke_id: dropoffSpokeId ? Number(dropoffSpokeId) : null
      });
      alert('Tạo đơn hàng thành công!');
      navigate('/orders');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const getActiveStore = () => stores.find(s => String(s.id_store) === String(formData.id_store));

  return (
    <form className="create-order-page" onSubmit={handleSubmit}>
      <div className="order-layout-7-3">
        {/* Main Column */}
        <div>
          <div className="ghn-env-border"></div>
          <div className="ghn-card" style={{borderRadius: '0 0 8px 8px'}}>
            
            {/* BÊN GỬI */}
            <div className="sender-block">
              <div className="sender-info">
                <div style={{fontWeight: 700, color: '#000', marginBottom: '8px'}}>Bên gửi</div>
                {getActiveStore() ? (
                  <>
                    <div className="sender-name-phone">
                      <span>{getActiveStore()?.store_name}</span>
                      <span><FiPhone size={14}/> {getActiveStore()?.phone}</span>
                    </div>
                    <div style={{margin: '4px 0'}}>{getActiveStore()?.address || 'Chưa thiết lập'}</div>
                    <div style={{marginTop: '8px'}}>
                      <span className="edit-link" style={{marginRight: '16px'}} onClick={() => setShowStoreSelector(true)}>Chọn kho khác</span>
                      <span className="edit-link" onClick={() => openAddressModalWithData('SENDER')}>Sửa địa chỉ</span>
                    </div>
                  </>
                ) : (
                  <span className="edit-link" onClick={() => navigate('/stores')}>Vui lòng thêm Kho Lấy Hàng</span>
                )}
              </div>
              <div>
                 <div className="radio-group-flex" style={{marginBottom: '16px'}}>
                    <label className="ghn-radio">
                      <input type="radio" name="pickup_type" checked={pickupType === 'TAN_NOI'} onChange={() => setPickupType('TAN_NOI')} />
                      Lấy hàng tận nơi
                    </label>
                    <label className="ghn-radio">
                      <input type="radio" name="pickup_type" checked={pickupType === 'BUU_CUC'} onChange={() => setPickupType('BUU_CUC')} />
                      Gửi hàng tại bưu cục
                    </label>
                 </div>
                 
                 {pickupType === 'TAN_NOI' ? (
                   <select className="ghn-input" value={pickupShift} onChange={e => setPickupShift(e.target.value)}>
                     <option value="">Chọn ca lấy hàng (Tự động)</option>
                     <option value={`Ca lấy: Hôm nay (12h00 - 18h00)`}>Ca lấy: Hôm nay (12h00 - 18h00)</option>
                     <option value={`Ca lấy: Ngày mai (07h00 - 12h00)`}>Ca lấy: Ngày mai (07h00 - 12h00)</option>
                     <option value={`Ca lấy: Ngày mai (12h00 - 18h00)`}>Ca lấy: Ngày mai (12h00 - 18h00)</option>
                   </select>
                 ) : (
                   <select className="ghn-input" value={dropoffSpokeId} onChange={e => setDropoffSpokeId(e.target.value)} required>
                     <option value="">Chọn bưu cục muốn gửi *</option>
                     {spokes.map(sp => (
                       <option key={sp.id_spoke} value={sp.id_spoke}>{sp.spoke_name} - {sp.address}</option>
                     ))}
                   </select>
                 )}
              </div>
            </div>

            {/* BÊN NHẬN */}
            <div style={{fontWeight: 700, color: '#000', marginBottom: '16px'}}>Bên nhận</div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>Số điện thoại *</label>
                <input required type="tel" className="ghn-input" placeholder="Nhập số điện thoại" 
                   value={formData.receiver_phone} onChange={e => setFormData({...formData, receiver_phone: e.target.value})} 
                />
                {formData.receiver_phone.length >= 10 && <div className="safe-badge">An toàn 91%</div>}
              </div>
              <div className="ghn-form-group">
                <label>Địa chỉ người nhận *</label>
                <div style={{position: 'relative'}} onClick={() => openAddressModalWithData('RECEIVER')}>
                  <input required type="text" className="ghn-input" placeholder="Nhập địa chỉ người nhận" 
                     value={formData.receiver_address} onChange={() => {}} readOnly
                     style={{ cursor: 'pointer' }}
                  />
                  <FiChevronRight style={{position: 'absolute', right: 12, top: 12, color: 'var(--slate-400)'}}/>
                </div>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>Họ tên *</label>
                <input required type="text" className="ghn-input" placeholder="Nhập họ tên" 
                   value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* THÔNG TIN KIỆN HÀNG */}
          <div className="ghn-card">
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
               <div className="ghn-card-title" style={{margin: 0}}>Thông tin kiện hàng</div>
               <button type="button" className="edit-link" style={{border: 'none', background: 'none'}}>+ Kiện có sẵn</button>
            </div>
            
            <div style={{display: 'flex', gap: '24px', alignItems: 'flex-start'}}>
                <div style={{padding: '8px 16px', background: 'var(--slate-50)', borderRadius: '4px', fontWeight: 600}}>Kiện 1</div>
                
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <div className="dimension-inputs">
                       <div className="dimension-label">Dài (cm) *</div>
                       <input type="number" className="ghn-input" value={formData.length} onChange={e => setFormData({...formData, length: Number(e.target.value)})} />
                       <div className="dimension-label">Rộng (cm) *</div>
                       <input type="number" className="ghn-input" value={formData.width} onChange={e => setFormData({...formData, width: Number(e.target.value)})} />
                       <div className="dimension-label">Cao (cm) *</div>
                       <input type="number" className="ghn-input" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} />
                    </div>
                    <div className="dimension-inputs">
                       <div className="dimension-label" style={{width: '60px'}}>Kiện *</div>
                       <input type="text" className="ghn-input" style={{flex: 1, textAlign: 'left'}} placeholder="Nhập tên kiện" defaultValue="Hàng hóa" />
                       <div className="dimension-label">KL (gram) *</div>
                       <input type="number" className="ghn-input" value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
                       <div style={{color: 'var(--primary-color)', fontWeight: 600, fontSize: '14px', marginLeft: '12px'}}>
                          KL qui đổi: {Math.max(formData.weight, (formData.length * formData.width * formData.height) / 5)} g
                       </div>
                    </div>
                </div>

                <div className="upload-box">
                  <FiImage size={24} />
                </div>
            </div>
            
            <div className="package-footer">
               <FiBox size={18} color="var(--primary-color)" /> Tổng KL tính cước (1 kiện): {Math.max(formData.weight, (formData.length * formData.width * formData.height) / 5)} g
            </div>
          </div>

          {/* THÔNG TIN ĐƠN HÀNG */}
          <div className="ghn-card">
            <div className="ghn-card-title">Thông tin đơn hàng</div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>Tổng tiền thu hộ (COD)</label>
                <input type="number" className="ghn-input" value={formData.cod_amount} onChange={e=>setFormData({...formData, cod_amount: Number(e.target.value)})} />
              </div>
              <div className="ghn-form-group">
                <label>Giao thất bại thu tiền</label>
                <input type="text" className="ghn-input" disabled value="20,000 đ" />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>Tổng giá trị hàng hóa</label>
                <input type="number" className="ghn-input" value={formData.item_value} onChange={e=>setFormData({...formData, item_value: Number(e.target.value)})} />
                <p style={{fontSize: '11px', color: 'var(--danger)', marginTop: '4px'}}>
                  Tổng giá trị hàng hóa sẽ là căn cứ để bồi thường khi phát sinh rủi ro. Chính sách bồi thường.
                </p>
              </div>
              <div className="ghn-form-group">
                <label>Mã đơn riêng khách hàng</label>
                <input type="text" className="ghn-input" placeholder="Nhập mã đơn riêng khách hàng (nếu có)" />
              </div>
            </div>
          </div>

          {/* GÓI DỊCH VỤ */}
          <div className="ghn-card">
            <div className="ghn-card-title">Gói dịch vụ</div>
            <div className="service-cards">
              <label className={`service-card ${formData.id_service_type === 1 ? 'active' : ''}`}>
                 <div className="service-card-header">
                   <input type="radio" name="service_type" checked={formData.id_service_type === 1} onChange={() => setFormData({...formData, id_service_type: 1})} />
                   <FiBox /> Hàng nhẹ ( &lt; 20kg )
                 </div>
                 <div style={{fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.6'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                      <span>Giao dự kiến:</span>
                      <strong style={{color: '#000'}}>Hôm sau</strong>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>Cước ước tính:</span>
                      <strong style={{color: 'var(--danger)'}}>{formData.id_service_type === 1 && previewFee ? Number(previewFee.total_fee).toLocaleString() + ' đ' : '...'}</strong>
                   </div>
                 </div>
              </label>

              <label className={`service-card ${formData.id_service_type === 2 ? 'active' : ''}`}>
                 <div className="service-card-header">
                   <input type="radio" name="service_type" checked={formData.id_service_type === 2} onChange={() => setFormData({...formData, id_service_type: 2})} />
                   <FiBox /> Hàng nặng ( &gt;= 20kg )
                 </div>
                 <div style={{fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.6'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                      <span>Giao dự kiến:</span>
                      <strong style={{color: '#000'}}>3-5 Ngày</strong>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>Cước ước tính:</span>
                      <strong style={{color: 'var(--danger)'}}>{formData.id_service_type === 2 && previewFee ? Number(previewFee.total_fee).toLocaleString() + ' đ' : '...'}</strong>
                   </div>
                 </div>
              </label>
            </div>
          </div>

        </div>

        {/* Sticky Sidebar */}
        <div className="sticky-bill">
          <div className="bill-content">
            <div className="bill-row">
              <span>Phí dịch vụ</span>
              <strong>{previewFee ? Number(previewFee.estimated_fee).toLocaleString('vi-VN') : 0} đ</strong>
            </div>
            {previewFee?.insurance_fee > 0 && (
              <div className="bill-row">
                <span>Phí bảo hiểm</span>
                <strong>{Number(previewFee.insurance_fee).toLocaleString('vi-VN')} đ</strong>
              </div>
            )}
            <div className="bill-row total">
              <span>Tổng phí:</span>
              <span>{previewFee ? Number(previewFee.total_fee).toLocaleString('vi-VN') : 0} đ</span>
            </div>

            <div className="promo-btn" style={{marginTop: '20px'}}>
              <span>🎟️ Mã khuyến mãi từ GHN</span>
              <FiChevronRight />
            </div>
          </div>
          
          <div style={{padding: '0 24px 16px 24px'}}>
            <select className="ghn-input" style={{width: '100%', background: 'var(--slate-50)'}}>
              <option>Vui lòng chọn bên trả phí</option>
              <option>Người gửi trả phí</option>
              <option>Người nhận trả phí</option>
            </select>
          </div>

          <div className="bill-actions">
            <button type="button" className="btn-draft">LƯU NHÁP</button>
            <button type="submit" disabled={loadingSubmit || !previewFee} className="btn-create">
               {loadingSubmit ? 'ĐANG XỬ LÝ...' : 'TẠO ĐƠN'}
            </button>
          </div>
        </div>
      </div>

      {showStoreSelector && (
        <div className="modal-overlay" onClick={() => setShowStoreSelector(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Chọn kho lấy hàng</h2>
              <button type="button" className="close-btn" onClick={() => setShowStoreSelector(false)}>&times;</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px'}}>
               {stores.map(s => (
                 <div key={s.id_store} 
                      onClick={() => handleSelectAnotherStore(String(s.id_store))}
                      style={{padding: '12px', border: String(s.id_store) === String(formData.id_store) ? '2px solid var(--primary-color)' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: String(s.id_store) === String(formData.id_store) ? '#fff5f0' : '#fff'}}>
                    <div style={{fontWeight: 600, color: '#000'}}>{s.store_name}</div>
                    <div style={{fontSize: '13px', color: '#555', marginTop: '4px'}}>{s.phone}</div>
                    <div style={{fontSize: '13px', color: '#555'}}>{s.address}</div>
                 </div>
               ))}
               <div style={{textAlign: 'center', marginTop: '8px'}}>
                 <span className="edit-link" onClick={() => navigate('/stores')}>+ Thêm/quản lý kho mới</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="modal-overlay" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>{addressModalType === 'SENDER' ? 'Sửa địa chỉ kho lấy hàng' : 'Nhập địa chỉ người nhận'}</h2>
              <button type="button" className="close-btn" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}>&times;</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px'}}>
               <select className="ghn-input" value={selectedProv?.code || ''} onChange={handleProvChange}>
                 <option value="">Chọn Tỉnh/Thành phố</option>
                 {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
               </select>
               <select className="ghn-input" value={selectedDist?.code || ''} onChange={handleDistChange} disabled={!selectedProv}>
                 <option value="">Chọn Quận/Huyện</option>
                 {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
               </select>
               <select className="ghn-input" value={selectedWard?.code || ''} onChange={e => setSelectedWard(wards.find(w=>w.code==e.target.value))} disabled={!selectedDist}>
                 <option value="">Chọn Phường/Xã</option>
                 {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
               </select>
               <input type="text" className="ghn-input" value={streetNum} onChange={e => setStreetNum(e.target.value)} placeholder="Nhập số nhà, tên đường..." disabled={!selectedWard} />
            </div>
            <div className="modal-footer">
              <button type="button" className="tag-btn" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}>Hủy</button>
              <button type="button" className="btn-create" onClick={saveAddress}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default CreateOrder;
