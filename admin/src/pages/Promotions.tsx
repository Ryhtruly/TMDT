import { useState, useEffect } from 'react';
import { FiGift, FiTag, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import apiClient from '../api/client';
import Drawer from '../components/ui/Drawer';

interface Promotion {
  id_promo: string; // UUID
  code: string;
  name: string;
  promo_type: 'PERCENT' | 'FIXED';
  discount_value: string;
  min_order: string;
  max_discount: string | null;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    promo_type: 'PERCENT',
    discount_value: 10,
    min_order: 0,
    max_discount: '',
    starts_at: '',
    expires_at: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/promotions/all');
      setPromotions(res?.data || []);
    } catch (error) {
      console.error('Lỗi lấy khuyến mãi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.put(`/promotions/${id}/toggle`);
      fetchPromotions();
    } catch (error) {
      alert('Không thể thay đổi trạng thái mã');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Tắt vĩnh viễn mã: ${code}? (Dùng Toggle để tạm dừng)`)) return;
    try {
      // Backend không có DELETE → dùng toggle OFF thay thế
      await apiClient.put(`/promotions/${id}/toggle`);
      fetchPromotions();
      alert(`Mã ${code} đã bị tắt. Bạn có thể bật lại bất cứ lúc nào.`);
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      };
      await apiClient.post('/promotions', payload);
      alert('Tạo mã khuyến mãi thành công!');
      setIsDrawerOpen(false);
      setForm({ code: '', name: '', promo_type: 'PERCENT', discount_value: 10, min_order: 0, max_discount: '', starts_at: '', expires_at: '' });
      fetchPromotions();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="promotions-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Chiến Dịch Khuyến Mãi</h1>
          <p className="page-subtitle">Tạo và quản lý mã voucher giảm cước gửi hàng cho Shop.</p>
        </div>
        <button className="btn-primary flex-center gap-2" onClick={() => setIsDrawerOpen(true)}>
          <FiGift /> Phát Hành Mã Mới
        </button>
      </div>

      <div className="admin-card">
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }}>
          Danh sách Mã Khuyến Mãi ({promotions.length})
        </h3>

        {loading ? <div className="loading-state">Đang tải...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Mã Voucher</th>
                <th style={{ width: '22%' }}>Tên Campaign</th>
                <th style={{ width: '12%' }}>Loại & Mức</th>
                <th style={{ width: '12%' }}>Đơn tối thiểu</th>
                <th style={{ width: '12%' }}>Giảm tối đa</th>
                <th style={{ width: '18%' }}>Thời Hạn</th>
                <th style={{ width: '12%' }} className="text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => (
                <tr key={p.id_promo}>
                  <td>
                    <span style={{ border: '2px dashed var(--primary-color)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', fontSize: '0.85rem' }}>
                      {p.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>
                    {p.promo_type === 'PERCENT'
                      ? `Giảm ${parseFloat(p.discount_value)}%`
                      : `Giảm ${parseFloat(p.discount_value).toLocaleString()}₫`}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {parseFloat(p.min_order || '0') > 0 ? parseFloat(p.min_order).toLocaleString() + '₫' : 'Không giới hạn'}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {p.max_discount ? parseFloat(p.max_discount).toLocaleString() + '₫' : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                    {new Date(p.starts_at).toLocaleDateString('vi-VN')} →<br />
                    {new Date(p.expires_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => handleToggle(p.id_promo)}
                        style={{
                          padding: '5px 12px', borderRadius: '20px', border: 'none', fontWeight: 600, fontSize: '0.8rem',
                          backgroundColor: p.is_active ? '#d1fae5' : '#fee2e2',
                          color: p.is_active ? '#047857' : '#b91c1c', cursor: 'pointer'
                        }}
                      >
                        {p.is_active ? <><FiToggleRight style={{ marginBottom: '-2px' }} /> ON</> : <><FiToggleLeft style={{ marginBottom: '-2px' }} /> OFF</>}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id_promo, p.code)}
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        title="Thu hồi mã"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr><td colSpan={7} className="empty-state">Chưa phát hành chương trình khuyến mãi nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Phát Hành Voucher Mới">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mã Code (tự động viết hoa)</label>
            <div style={{ position: 'relative' }}>
              <FiTag style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} />
              <input
                type="text" required className="form-control"
                style={{ paddingLeft: '36px' }}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: FREESHIP100"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tên Campaign</label>
            <input type="text" required className="form-control" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Miễn phí ship Hà Nội" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Hình thức giảm</label>
              <select className="form-control" value={form.promo_type}
                onChange={e => setForm({ ...form, promo_type: e.target.value })}>
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Tiền cố định (₫)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Mức giảm ({form.promo_type === 'PERCENT' ? '%' : '₫'})
              </label>
              <input type="number" step="0.1" required className="form-control"
                value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: parseFloat(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Đơn tối thiểu (₫)</label>
              <input type="number" className="form-control" value={form.min_order}
                onChange={e => setForm({ ...form, min_order: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Giảm tối đa (₫, bỏ trống = không giới hạn)</label>
              <input type="number" className="form-control" value={form.max_discount}
                placeholder="Không giới hạn"
                onChange={e => setForm({ ...form, max_discount: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ngày bắt đầu</label>
              <input type="datetime-local" required className="form-control" value={form.starts_at}
                onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ngày hết hạn</label>
              <input type="datetime-local" required className="form-control" value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={formLoading} style={{ padding: '12px', marginTop: '4px' }}>
            {formLoading ? 'Đang tạo...' : '🎁 Phát Hành Mã Mới'}
          </button>
        </form>
      </Drawer>
    </div>
  );
};

export default Promotions;
