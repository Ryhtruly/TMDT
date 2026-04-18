import { useState, useEffect } from 'react';
import { FiDollarSign, FiShield, FiEdit2, FiSave, FiLoader } from 'react-icons/fi';
import apiClient from '../api/client';

interface PricingRule {
  id_rule: number;
  route_type: string;
  area_type: string;
  weight_step: number;
  price: number;
}

interface ServiceType {
  id_service: number;
  service_name: string;
  description: string;
  multiplier: number;
}

const Settings = () => {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ price: number; weight_step: number }>({ price: 0, weight_step: 0 });
  const [loadingRules, setLoadingRules] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

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
    setEditForm({ price: rule.price, weight_step: rule.weight_step });
  };

  const handleSaveRule = async (id_rule: number) => {
    setSavingId(id_rule);
    try {
      await apiClient.put('/admin/pricing-rules', {
        id_rule,
        price: editForm.price,
        weight_step: editForm.weight_step,
      });
      setEditingId(null);
      fetchPricingRules();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingId(null);
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
                  <th style={{ width: '6%' }}>ID</th>
                  <th style={{ width: '18%' }}>Loại Tuyến</th>
                  <th style={{ width: '18%' }}>Khu Vực</th>
                  <th style={{ width: '20%' }}>Bước Cân (kg)</th>
                  <th style={{ width: '22%' }}>Đơn Giá (₫)</th>
                  <th style={{ width: '16%' }} className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pricingRules
                  .filter(r => r.route_type !== 'INSURANCE')
                  .map(rule => {
                    const isEditing = editingId === rule.id_rule;
                    const isSaving = savingId === rule.id_rule;
                    const c = routeTypeColor(rule.route_type);
                    return (
                      <tr key={rule.id_rule}>
                        <td><span className="badge-id">#{rule.id_rule}</span></td>
                        <td>
                          <span style={{ backgroundColor: c.bg, color: c.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                            {rule.route_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{rule.area_type}</td>
                        <td>
                            {isEditing ? (
                              <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                <span>Dưới</span>
                                <input type="number" step="500" className="form-control"
                                  style={{ padding: '6px 10px', maxWidth: '90px' }}
                                  value={editForm.weight_step}
                                  onChange={e => setEditForm({ ...editForm, weight_step: parseFloat(e.target.value) })} />
                                <span>g</span>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 500 }}>Dưới {rule.weight_step >= 1000 ? `${rule.weight_step / 1000}kg` : `${rule.weight_step}g`}</span>
                            )}
                          </td>
                        <td>
                          {isEditing ? (
                            <input type="number" className="form-control"
                              style={{ padding: '6px 10px', maxWidth: '150px' }}
                              value={editForm.price}
                              onChange={e => setEditForm({ ...editForm, price: parseFloat(e.target.value) })} />
                          ) : (
                            <span style={{ fontWeight: 700, color: '#047857' }}>{parseFloat(String(rule.price)).toLocaleString('vi-VN')}₫</span>
                          )}
                        </td>
                        <td className="text-right">
                          {isEditing ? (
                            <button className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleSaveRule(rule.id_rule)}
                              disabled={isSaving}>
                              {isSaving ? <FiLoader /> : <FiSave />}
                              {isSaving ? 'Đang lưu...' : 'Lưu'}
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
                  <tr><td colSpan={6} className="empty-state">Chưa có pricing rules nào.</td></tr>
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
              <div key={svc.id_service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{svc.service_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>{svc.description}</div>
                </div>
                <span style={{ fontWeight: 700, backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                  x{parseFloat(String(svc.multiplier)).toFixed(1)}
                </span>
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
