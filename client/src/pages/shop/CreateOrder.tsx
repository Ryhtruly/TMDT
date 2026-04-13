import { useEffect, useState } from 'react';
import { FiBox, FiChevronRight, FiPhone } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './CreateOrder.css';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramType = searchParams.get('type') || '1';

  const [stores, setStores] = useState<any[]>([]);
  const [spokes, setSpokes] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<'RECEIVER' | 'SENDER' | null>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  const [selectedProv, setSelectedProv] = useState<any>(null);
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [streetNum, setStreetNum] = useState('');

  const [pickupType, setPickupType] = useState('TAN_NOI');
  const [pickupShift, setPickupShift] = useState('');
  const [dropoffSpokeId, setDropoffSpokeId] = useState('');
  const [idDestArea, setIdDestArea] = useState<number | null>(null);
  const [previewFee, setPreviewFee] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [formData, setFormData] = useState({
    id_store: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    payer_type: 'SENDER',
    fee_payment_method: 'WALLET',
    id_service_type: Number(paramType),
    weight: paramType === '2' ? 20000 : 200,
    item_value: 0,
    cod_amount: 0,
    length: 10,
    width: 10,
    height: 10,
    note: '',
  });

  const getActiveStore = () => stores.find((s) => String(s.id_store) === String(formData.id_store));

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      id_service_type: Number(paramType),
      weight: paramType === '2' ? 20000 : prev.weight === 20000 ? 200 : prev.weight,
    }));
  }, [paramType]);

  useEffect(() => {
    if (formData.payer_type === 'RECEIVER' && formData.fee_payment_method !== 'CASH') {
      setFormData((prev) => ({ ...prev, fee_payment_method: 'CASH' }));
    }
  }, [formData.payer_type, formData.fee_payment_method]);

  useEffect(() => {
    const load = async () => {
      const storeRes = (await apiClient.get('/shop/stores').catch(() => null)) as any;
      if (storeRes?.status === 'success') {
        setStores(storeRes.data);
        const defaultId = localStorage.getItem('default_store');
        const firstId = defaultId && storeRes.data.some((s: any) => String(s.id_store) === defaultId)
          ? defaultId
          : String(storeRes.data[0]?.id_store || '');
        if (firstId) setFormData((prev) => ({ ...prev, id_store: firstId }));
      }

      const spokeRes = (await apiClient.get('/shop/spokes').catch(() => null)) as any;
      if (spokeRes?.status === 'success') setSpokes(spokeRes.data);
    };

    load().catch(console.error);
    fetch('https://provinces.open-api.vn/api/p/').then((res) => res.json()).then(setProvinces).catch(console.error);
    const onStoreChanged = () => {
      const id = localStorage.getItem('default_store');
      if (id) setFormData((prev) => ({ ...prev, id_store: id }));
    };
    window.addEventListener('default_store_changed', onStoreChanged);
    return () => window.removeEventListener('default_store_changed', onStoreChanged);
  }, []);

  const handleProvChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = provinces.find((p) => String(p.code) === e.target.value) || null;
    setSelectedProv(prov);
    setSelectedDist(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    if (!prov) return;
    const res = await fetch(`https://provinces.open-api.vn/api/p/${prov.code}?depth=2`);
    const data = await res.json();
    setDistricts(data.districts || []);
  };

  const handleDistChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dist = districts.find((d) => String(d.code) === e.target.value) || null;
    setSelectedDist(dist);
    setSelectedWard(null);
    setWards([]);
    if (!dist) return;
    const res = await fetch(`https://provinces.open-api.vn/api/d/${dist.code}?depth=2`);
    const data = await res.json();
    setWards(data.wards || []);
  };

  const openAddressModal = async (type: 'RECEIVER' | 'SENDER') => {
    setAddressModalType(type);
    setShowAddressModal(true);
    setSelectedProv(null);
    setSelectedDist(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setStreetNum('');
  };

  const saveAddress = async () => {
    if (!selectedProv || !selectedDist || !selectedWard || !streetNum) {
      alert('Vui long nhap day du thong tin dia chi.');
      return;
    }

    const fullAddress = `${streetNum}, ${selectedWard.name}, ${selectedDist.name}, ${selectedProv.name}`;
    if (addressModalType === 'RECEIVER') {
      try {
        const res = (await apiClient.get(
          `/shop/areas/resolve?province=${encodeURIComponent(selectedProv.name)}&district=${encodeURIComponent(selectedDist.name)}`
        )) as any;
        setIdDestArea(Number(res.data.id_area));
        setFormData((prev) => ({ ...prev, receiver_address: fullAddress }));
        setShowAddressModal(false);
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Chua cau hinh khu vuc giao cho dia chi nay.');
      }
      return;
    }

    const store = getActiveStore();
    if (!store) return;
    await apiClient.put(`/shop/stores/${store.id_store}`, { ...store, address: fullAddress });
    setStores((prev) => prev.map((item) => (item.id_store === store.id_store ? { ...item, address: fullAddress } : item)));
    setShowAddressModal(false);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!formData.id_store || !idDestArea) {
        setPreviewFee(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const res = (await apiClient.post('/shop/orders/preview-fee', {
          id_store: Number(formData.id_store),
          id_dest_area: idDestArea,
          payer_type: formData.payer_type,
          fee_payment_method: formData.fee_payment_method,
          id_service_type: Number(formData.id_service_type),
          weight: Number(formData.weight),
          item_value: Number(formData.item_value || 0),
          cod_amount: Number(formData.cod_amount || 0),
          length: Number(formData.length || 0),
          width: Number(formData.width || 0),
          height: Number(formData.height || 0),
        })) as any;
        setPreviewFee(res?.status === 'success' ? res.data : null);
      } catch {
        setPreviewFee(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData, idDestArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_store) return alert('Vui long tao kho gui hang truoc.');
    if (!idDestArea) return alert('Vui long chon dia chi nguoi nhan thuoc khu vuc da cau hinh.');

    try {
      setLoadingSubmit(true);
      const res = (await apiClient.post('/shop/orders', {
        ...formData,
        id_store: Number(formData.id_store),
        id_dest_area: idDestArea,
        pickup_shift: pickupShift || 'Ca mac dinh',
        dropoff_spoke_id: dropoffSpokeId ? Number(dropoffSpokeId) : null,
      })) as any;

      window.dispatchEvent(new Event('wallet_updated'));
      const fee = res?.data?.fee_summary || {};
      const chargedNow = Number(fee.sender_charged_now || 0);
      const senderCash = Number(fee.sender_cash_fee_on_pickup || 0);
      const deliveryCash = Number(fee.cash_to_collect_on_delivery || 0);
      let message = 'Tao don thanh cong.';
      if (formData.payer_type === 'RECEIVER') {
        message += `\nShipper se thu ${deliveryCash.toLocaleString('vi-VN')} d tu nguoi nhan khi giao.`;
      } else if (formData.fee_payment_method === 'CASH') {
        message += `\nShipper se thu ${senderCash.toLocaleString('vi-VN')} d tien phi tu shop khi lay hang.`;
        if (deliveryCash > 0) message += `\nKhi giao, shipper thu them COD ${deliveryCash.toLocaleString('vi-VN')} d tu nguoi nhan.`;
      } else {
        message += `\nDa tru ${chargedNow.toLocaleString('vi-VN')} d tu vi shop.`;
        if (deliveryCash > 0) message += `\nKhi giao, shipper thu COD ${deliveryCash.toLocaleString('vi-VN')} d tu nguoi nhan.`;
      }
      alert(message);
      navigate('/orders');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Co loi xay ra.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const fee = previewFee?.fee_breakdown || {};
  const flow = previewFee?.payment_flow || {};
  const walletCheck = previewFee?.wallet_check || {};
  const billableWeight = Math.max(Number(formData.weight || 0), (Number(formData.length || 0) * Number(formData.width || 0) * Number(formData.height || 0)) / 5);

  return (
    <form className="create-order-page" onSubmit={handleSubmit}>
      <div className="order-layout-7-3">
        <div>
          <div className="ghn-env-border"></div>
          <div className="ghn-card" style={{ borderRadius: '0 0 8px 8px' }}>
            <div className="sender-block">
              <div className="sender-info">
                <div style={{ fontWeight: 700, color: '#000', marginBottom: '8px' }}>Ben gui</div>
                {getActiveStore() ? (
                  <>
                    <div className="sender-name-phone"><span>{getActiveStore()?.store_name}</span><span><FiPhone size={14} /> {getActiveStore()?.phone}</span></div>
                    <div style={{ margin: '4px 0' }}>{getActiveStore()?.address || 'Chua thiet lap'}</div>
                    <div style={{ marginTop: '8px' }}>
                      <span className="edit-link" style={{ marginRight: '16px' }} onClick={() => setShowStoreSelector(true)}>Chon kho khac</span>
                      <span className="edit-link" onClick={() => openAddressModal('SENDER')}>Sua dia chi</span>
                    </div>
                  </>
                ) : <span className="edit-link" onClick={() => navigate('/stores')}>Vui long them kho lay hang</span>}
              </div>
              <div>
                <div className="radio-group-flex" style={{ marginBottom: '16px' }}>
                  <label className="ghn-radio"><input type="radio" checked={pickupType === 'TAN_NOI'} onChange={() => setPickupType('TAN_NOI')} /> Lay hang tan noi</label>
                  <label className="ghn-radio"><input type="radio" checked={pickupType === 'BUU_CUC'} onChange={() => setPickupType('BUU_CUC')} /> Gui hang tai buu cuc</label>
                </div>
                {pickupType === 'TAN_NOI' ? (
                  <select className="ghn-input" value={pickupShift} onChange={(e) => setPickupShift(e.target.value)}>
                    <option value="">Chon ca lay hang (Tu dong)</option>
                    <option value="Ca lay: Hom nay (12h00 - 18h00)">Ca lay: Hom nay (12h00 - 18h00)</option>
                    <option value="Ca lay: Ngay mai (07h00 - 12h00)">Ca lay: Ngay mai (07h00 - 12h00)</option>
                    <option value="Ca lay: Ngay mai (12h00 - 18h00)">Ca lay: Ngay mai (12h00 - 18h00)</option>
                  </select>
                ) : (
                  <select className="ghn-input" value={dropoffSpokeId} onChange={(e) => setDropoffSpokeId(e.target.value)} required>
                    <option value="">Chon buu cuc muon gui *</option>
                    {spokes.map((sp: any) => <option key={sp.id_spoke} value={sp.id_spoke}>{sp.spoke_name} - {sp.address}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div style={{ fontWeight: 700, color: '#000', marginBottom: '16px' }}>Ben nhan</div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>So dien thoai *</label>
                <input required type="tel" className="ghn-input" placeholder="Nhap so dien thoai" value={formData.receiver_phone} onChange={(e) => setFormData((p) => ({ ...p, receiver_phone: e.target.value }))} />
              </div>
              <div className="ghn-form-group">
                <label>Dia chi nguoi nhan *</label>
                <div style={{ position: 'relative' }} onClick={() => openAddressModal('RECEIVER')}>
                  <input required type="text" className="ghn-input" placeholder="Nhap dia chi nguoi nhan" value={formData.receiver_address} readOnly style={{ cursor: 'pointer' }} />
                  <FiChevronRight style={{ position: 'absolute', right: 12, top: 12, color: 'var(--slate-400)' }} />
                </div>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="ghn-form-group">
                <label>Ho ten *</label>
                <input required type="text" className="ghn-input" placeholder="Nhap ho ten" value={formData.receiver_name} onChange={(e) => setFormData((p) => ({ ...p, receiver_name: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="ghn-card">
            <div className="ghn-card-title">Thong tin kien hang</div>
            <div className="dimension-inputs" style={{ marginBottom: '16px' }}>
              <div className="dimension-label">Dai (cm) *</div>
              <input type="number" className="ghn-input" value={formData.length} onChange={(e) => setFormData((p) => ({ ...p, length: Number(e.target.value) }))} />
              <div className="dimension-label">Rong (cm) *</div>
              <input type="number" className="ghn-input" value={formData.width} onChange={(e) => setFormData((p) => ({ ...p, width: Number(e.target.value) }))} />
              <div className="dimension-label">Cao (cm) *</div>
              <input type="number" className="ghn-input" value={formData.height} onChange={(e) => setFormData((p) => ({ ...p, height: Number(e.target.value) }))} />
            </div>
            <div className="dimension-inputs">
              <div className="dimension-label" style={{ width: '60px' }}>Kien *</div>
              <input type="text" className="ghn-input" style={{ flex: 1, textAlign: 'left' }} defaultValue="Hang hoa" />
              <div className="dimension-label">KL (gram) *</div>
              <input type="number" className="ghn-input" value={formData.weight} onChange={(e) => setFormData((p) => ({ ...p, weight: Number(e.target.value) }))} />
              <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '14px', marginLeft: '12px' }}>KL quy doi: {billableWeight} g</div>
            </div>
            <div className="package-footer"><FiBox size={18} color="var(--primary-color)" /> Tong KL tinh cuoc (1 kien): {billableWeight} g</div>
          </div>

          <div className="ghn-card">
            <div className="ghn-card-title">Thong tin don hang</div>
            <div className="form-grid-2">
              <div className="ghn-form-group"><label>Tong tien thu ho (COD)</label><input type="number" className="ghn-input" value={formData.cod_amount} onChange={(e) => setFormData((p) => ({ ...p, cod_amount: Number(e.target.value) }))} /></div>
              <div className="ghn-form-group"><label>Tong gia tri hang hoa</label><input type="number" className="ghn-input" value={formData.item_value} onChange={(e) => setFormData((p) => ({ ...p, item_value: Number(e.target.value) }))} /></div>
            </div>
          </div>

          <div className="ghn-card">
            <div className="ghn-card-title">Goi dich vu</div>
            <div className="service-cards">
              <label className={`service-card ${formData.id_service_type === 1 ? 'active' : ''}`}><div className="service-card-header"><input type="radio" checked={formData.id_service_type === 1} onChange={() => setFormData((p) => ({ ...p, id_service_type: 1 }))} /> <FiBox /> Hang nhe (&lt; 20kg)</div></label>
              <label className={`service-card ${formData.id_service_type === 2 ? 'active' : ''}`}><div className="service-card-header"><input type="radio" checked={formData.id_service_type === 2} onChange={() => setFormData((p) => ({ ...p, id_service_type: 2 }))} /> <FiBox /> Hang nang (&gt;= 20kg)</div></label>
            </div>
          </div>
        </div>

        <div className="sticky-bill">
          <div className="bill-content">
            <div className="bill-row"><span>Phi dich vu</span><strong>{Number(fee.shipping_fee || 0).toLocaleString('vi-VN')} d</strong></div>
            {Number(fee.insurance_fee || 0) > 0 && <div className="bill-row"><span>Phi bao hiem</span><strong>{Number(fee.insurance_fee || 0).toLocaleString('vi-VN')} d</strong></div>}
            <div className="bill-row total"><span>Tong phi:</span><span>{Number(fee.total_fee || 0).toLocaleString('vi-VN')} d</span></div>

            {!previewFee && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--slate-500)' }}>Chon dia chi nguoi nhan de xem phi.</div>}
            {previewFee && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <div className="bill-row"><span>COD shop thu ho</span><strong>{Number(formData.cod_amount || 0).toLocaleString('vi-VN')} d</strong></div>
                <div className="bill-row"><span>Shop tra bang vi</span><strong>{Number(flow.sender_charge_now || 0).toLocaleString('vi-VN')} d</strong></div>
                <div className="bill-row"><span>Shop tra tien mat luc lay</span><strong>{Number(flow.sender_cash_fee_on_pickup || 0).toLocaleString('vi-VN')} d</strong></div>
                <div className="bill-row"><span>Nguoi nhan tra phi</span><strong>{Number(flow.receiver_fee_on_delivery || 0).toLocaleString('vi-VN')} d</strong></div>
                <div className="bill-row total"><span>Shipper can thu khi giao</span><span>{Number(flow.cash_to_collect_on_delivery || 0).toLocaleString('vi-VN')} d</span></div>
                <div className="bill-row total"><span>Tong tien mat shipper nop</span><span>{Number(flow.total_cash_expected_from_shipper || 0).toLocaleString('vi-VN')} d</span></div>
              </div>
            )}
            {previewFee && formData.payer_type === 'SENDER' && formData.fee_payment_method === 'WALLET' && <div style={{ marginTop: '12px', fontSize: '12px', color: walletCheck.is_sufficient ? '#0f766e' : '#b91c1c' }}>So du kha dung: {Number(walletCheck.available_balance || 0).toLocaleString('vi-VN')} d. Sau tao don con: {Math.max(0, Number(walletCheck.available_balance || 0) - Number(flow.sender_charge_now || 0)).toLocaleString('vi-VN')} d.</div>}
            {walletCheck.warning && <div style={{ marginTop: '10px', fontSize: '12px', color: walletCheck.is_sufficient ? '#0f766e' : '#b91c1c' }}>{walletCheck.warning}</div>}
            <div className="promo-btn" style={{ marginTop: '20px' }}><span>Ma khuyen mai tu GHN</span><FiChevronRight /></div>
          </div>

          <div style={{ padding: '0 24px 16px 24px' }}>
            <select className="ghn-input" style={{ width: '100%', background: 'var(--slate-50)' }} value={formData.payer_type} onChange={(e) => setFormData((p) => ({ ...p, payer_type: e.target.value, fee_payment_method: e.target.value === 'RECEIVER' ? 'CASH' : p.fee_payment_method }))}>
              <option value="SENDER">Nguoi gui tra phi</option>
              <option value="RECEIVER">Nguoi nhan tra phi</option>
            </select>
            {formData.payer_type === 'SENDER' && (
              <select
                className="ghn-input"
                style={{ width: '100%', background: 'var(--slate-50)', marginTop: '10px' }}
                value={formData.fee_payment_method}
                onChange={(e) => setFormData((p) => ({ ...p, fee_payment_method: e.target.value }))}
              >
                <option value="WALLET">Tru vi shop khi tao don</option>
                <option value="CASH">Shop tra tien mat cho shipper khi lay hang</option>
              </select>
            )}
            <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '8px' }}>
              {formData.payer_type === 'RECEIVER'
                ? 'Phi ship se duoc thu them tu nguoi nhan khi giao.'
                : formData.fee_payment_method === 'CASH'
                  ? 'Phi ship khong tru vi; shipper thu tien mat tu shop luc lay hang va doi soat ve APP.'
                  : 'Phi ship se bi tru tu vi shop ngay khi tao don.'}
            </p>
          </div>

          <div className="bill-actions">
            <button type="button" className="btn-draft">LUU NHAP</button>
            <button type="submit" disabled={loadingSubmit || loadingPreview || !previewFee} className="btn-create">{loadingSubmit ? 'DANG XU LY...' : 'TAO DON'}</button>
          </div>
        </div>
      </div>

      {showStoreSelector && <div className="modal-overlay" onClick={() => setShowStoreSelector(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}><div className="modal-header"><h2>Chon kho lay hang</h2><button type="button" className="close-btn" onClick={() => setShowStoreSelector(false)}>&times;</button></div><div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>{stores.map((s) => <div key={s.id_store} onClick={() => { setFormData((p) => ({ ...p, id_store: String(s.id_store) })); localStorage.setItem('default_store', String(s.id_store)); window.dispatchEvent(new Event('default_store_changed')); setShowStoreSelector(false); }} style={{ padding: '12px', border: String(s.id_store) === String(formData.id_store) ? '2px solid var(--primary-color)' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}><div style={{ fontWeight: 600, color: '#000' }}>{s.store_name}</div><div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.phone}</div><div style={{ fontSize: '13px', color: '#555' }}>{s.address}</div></div>)}</div></div></div>}

      {showAddressModal && <div className="modal-overlay" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}><div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}><div className="modal-header"><h2>{addressModalType === 'SENDER' ? 'Sua dia chi kho lay hang' : 'Nhap dia chi nguoi nhan'}</h2><button type="button" className="close-btn" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}>&times;</button></div><div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}><select className="ghn-input" value={selectedProv?.code || ''} onChange={handleProvChange}><option value="">Chon Tinh/Thanh pho</option>{provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select><select className="ghn-input" value={selectedDist?.code || ''} onChange={handleDistChange} disabled={!selectedProv}><option value="">Chon Quan/Huyen</option>{districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select><select className="ghn-input" value={selectedWard?.code || ''} onChange={(e) => setSelectedWard(wards.find((w) => String(w.code) === e.target.value))} disabled={!selectedDist}><option value="">Chon Phuong/Xa</option>{wards.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}</select><input type="text" className="ghn-input" value={streetNum} onChange={(e) => setStreetNum(e.target.value)} placeholder="Nhap so nha, ten duong..." disabled={!selectedWard} /></div><div className="modal-footer"><button type="button" className="tag-btn" onClick={() => { setShowAddressModal(false); setAddressModalType(null); }}>Huy</button><button type="button" className="btn-create" onClick={saveAddress}>Xac nhan</button></div></div></div>}
    </form>
  );
};

export default CreateOrder;
