import { useState, useEffect } from 'react';
import { FiDollarSign, FiShield, FiEdit2, FiSave, FiLoader } from 'react-icons/fi';
import apiClient from '../api/client';

interface PricingRule {
  id_rule: number;
  route_type: string;
  area_type: string;
  goods_type: string;
  base_weight_g: number;
  extra_per_500g: number;
  price: number;
}

interface ServiceType {
  id_service: number;
  service_name: string;
  description: string;
  base_multiplier: number;
}

const Settings = () => {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ price: number; base_weight_g: number; extra_per_500g: number }>({ price: 0, base_weight_g: 500, extra_per_500g: 2000 });
  const [loadingRules, setLoadingRules] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [editingSvcId, setEditingSvcId] = useState<number | null>(null);
  const [svcForm, setSvcForm] = useState({ description: '', base_multiplier: 1.0 });
  const [savingSvcId, setSavingSvcId] = useState<number | null>(null);

  const [insurance, setInsurance] = useState({ threshold: 500000, rate_percent: 1.5 });
  const [loadingIns, setLoadingIns] = useState(false);

  useEffect(() => {
    fetchPricingRules();
    fetchServiceTypes();
  }, []);

  const fetchPricingRules = async () => {
    setLoadingRules(true);
    try {
      const res = await apiClient.get('/admin/pricing-rules');
      setPricingRules(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const res = await apiClient.get('/admin/service-types');
      setServiceTypes(res?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (rule: PricingRule) => {
    setEditingId(rule.id_rule);
    setEditForm({ price: rule.price, base_weight_g: rule.base_weight_g, extra_per_500g: rule.extra_per_500g });
  };

  const startEditSvc = (svc: ServiceType) => {
    setEditingSvcId(svc.id_service);
    setSvcForm({ description: svc.description, base_multiplier: parseFloat(String(svc.base_multiplier)) });
  };

  const handleSaveRule = async (id_rule: number) => {
    setSavingId(id_rule);
    try {
      await apiClient.put('/admin/pricing-rules', {
        id_rule,
        price: editForm.price,
        base_weight_g: editForm.base_weight_g,
        extra_per_500g: editForm.extra_per_500g,
      });
      setEditingId(null);
      fetchPricingRules();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveSvc = async (id_service: number) => {
    setSavingSvcId(id_service);
    try {
      await apiClient.put(`/admin/service-types/${id_service}`, svcForm);
      setEditingSvcId(null);
      fetchServiceTypes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dịch vụ');
    } finally {
      setSavingSvcId(null);
    }
  };

  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingIns(true);
    try {
      await apiClient.put('/admin/insurance-config', {
        threshold: insurance.threshold,
        rate_percent: insurance.rate_percent,
      });
      alert('Đã cập nhật khung phí bảo hiểm hệ thống!');
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingIns(false);
    }
  };

  const routeTypeColor = (type: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      INTRA: { bg: '#dbeafe', color: '#1d4ed8' },
      INTER: { bg: '#ede9fe', color: '#6d28d9' },
      EXPRESS: { bg: '#fff7ed', color: '#c2410c' },
      INSURANCE: { bg: '#fef9c3', color: '#854d0e' },
    };
    return map[type] || { bg: '#f3f4f6', color: '#374151' };
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Thiết Lập Hệ Thống (Master Configuration)</h1>
        <p className="page-subtitle">Quản lý bảng giá cước, cấu hình bảo hiểm và loại dịch vụ vận chuyển.</p>
      </div>

      {/* PRICING RULES TABLE */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          <FiDollarSign className="text-primary" /> Bảng Giá Cước Giao Hàng (Pricing Rules)
        </h3>

        {loadingRules ? (
          <div className="loading-state">Đang tải bảng giá...</div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>ID</th>
                  <th style={{ width: '14%' }}>Loại Tuyến</th>
                  <th style={{ width: '12%' }}>Khu Vực</th>
                  <th style={{ width: '10%' }}>Nhóm Hàng</th>
                  <th style={{ width: '14%' }}>Cước Cơ Bản (≤ base)</th>
                  <th style={{ width: '18%' }}>Giá Base (♤)</th>
                  <th style={{ width: '18%' }}>Thêm / bước cân (♤)</th>
                  <th style={{ width: '9%' }} className="text-right">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {pricingRules
                  .filter(r => r.route_type !== 'INSURANCE')
                  .map(rule => {
                    const isEditing = editingId === rule.id_rule;
                    const isSaving = savingId === rule.id_rule;
                    const isHeavy = rule.goods_type === 'HEAVY';
                    return (
                      <tr key={rule.id_rule}>
                        <td><span className="badge-id">#{rule.id_rule}</span></td>
                        <td>
                          <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                            {rule.route_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{rule.area_type}</td>
                        <td>
                          <span style={{
                            backgroundColor: isHeavy ? '#fef3c7' : '#dbeafe',
                            color: isHeavy ? '#92400e' : '#1d4ed8',
                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700
                          }}>
                            {isHeavy ? '⚖️ Hàng Nặng' : '🫁 Hàng Nhẹ'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {isHeavy ? `≤ 20kg` : `≤ ${Number(rule.base_weight_g)/1000}kg`}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" step="500" className="form-control"
                              style={{ padding: '6px 10px', maxWidth: '120px' }}
                              value={editForm.price}
                              onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} />
                          ) : (
                            <span style={{ fontWeight: 700, color: '#047857' }}>{parseFloat(String(rule.price)).toLocaleString('vi-VN')}♦</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="number" step="500" className="form-control"
                              style={{ padding: '6px 10px', maxWidth: '120px' }}
                              value={editForm.extra_per_500g}
                              onChange={e => setEditForm({ ...editForm, extra_per_500g: parseFloat(e.target.value) })} />
                          ) : (
                            <span style={{ fontWeight: 500, color: '#c2410c' }}>+{parseFloat(String(rule.extra_per_500g)).toLocaleString('vi-VN')}♦/{isHeavy ? '1kg' : '500g'}</span>
                          )}
                        </td>
                        <td className="text-right">
                          {isEditing ? (
                            <button className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleSaveRule(rule.id_rule)}
                              disabled={isSaving}>
                              {isSaving ? <FiLoader /> : <FiSave />}
                              {isSaving ? 'Lưu...' : 'Lưu'}
                            </button>
                          ) : (
                            <button className="action-btn text-primary" title="Sửa" onClick={() => startEdit(rule)}>
                              <FiEdit2 />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {pricingRules.filter(r => r.route_type !== 'INSURANCE').length === 0 && (
                  <tr><td colSpan={8} className="empty-state">Chưa có pricing rules nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* SERVICE TYPES */}
        <div className="admin-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
            <FiDollarSign className="text-primary" /> Loại Dịch Vụ Vận Chuyển
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {serviceTypes.map(svc => (
              <div key={svc.id_service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                {editingSvcId === svc.id_service ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{svc.service_name}</div>
                    <label style={{ fontSize: '0.85rem' }}>Mô tả ngắn:</label>
                    <input type="text" className="form-control" style={{ padding: '6px' }} value={svcForm.description} onChange={(e) => setSvcForm(p => ({ ...p, description: e.target.value }))} />
                    <label style={{ fontSize: '0.85rem' }}>Hệ số x (Base Multiplier):</label>
                    <input type="number" step="0.1" className="form-control" style={{ padding: '6px', maxWidth: '100px' }} value={svcForm.base_multiplier} onChange={(e) => setSvcForm(p => ({ ...p, base_multiplier: parseFloat(e.target.value) }))} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="btn-save" style={{ padding: '4px 12px', fontSize: '0.85rem' }} disabled={savingSvcId === svc.id_service} onClick={() => handleSaveSvc(svc.id_service)}>
                        {savingSvcId === svc.id_service ? '...' : 'Lưu'}
                      </button>
                      <button className="btn-cancel" style={{ padding: '4px 12px', fontSize: '0.85rem' }} onClick={() => setEditingSvcId(null)}>Hủy</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{svc.service_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>{svc.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                        x{parseFloat(String(svc.base_multiplier)).toFixed(1)}
                      </span>
                      <button className="action-btn text-primary" style={{ padding: '4px' }} title="Sửa" onClick={() => startEditSvc(svc)}>
                        <FiEdit2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {serviceTypes.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Đang tải...</p>}
          </div>
        </div>

        {/* INSURANCE CONFIG */}
        <div className="admin-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <FiShield className="text-primary" /> Phí Bảo Hiểm Chống Thất Thoát
          </h3>
          <form onSubmit={handleSaveInsurance} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff3ec', padding: '15px', borderRadius: '8px', color: '#F26522', fontSize: '0.9rem' }}>
              Ghi chú: Phí bảo hiểm được tính bằng % trên tổng giá trị hàng hóa Chủ Shop khai báo. Áp dụng khi giá trị hàng vượt ngưỡng cấu hình.
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ngưỡng Giá Trị Hàng (₫)</label>
              <input
                type="number"
                required
                className="form-control"
                value={insurance.threshold}
                onChange={e => setInsurance({ ...insurance, threshold: parseFloat(e.target.value) })}
                placeholder="VD: 500000"
              />
              <small style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hàng có giá trị &gt; ngưỡng này sẽ bị tính phí bảo hiểm</small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tỷ lệ Thu Phí (%)</label>
              <input
                type="number"
                step="0.1"
                required
                className="form-control"
                value={insurance.rate_percent}
                onChange={e => setInsurance({ ...insurance, rate_percent: parseFloat(e.target.value) })}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loadingIns} style={{ marginTop: '10px' }}>
              {loadingIns ? 'Đang lưu...' : '🛡️ Lưu Thay Đổi (Insurance)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
