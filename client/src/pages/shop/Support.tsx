import { useState, useEffect } from 'react';
import { FiMessageSquare, FiPhoneCall, FiMail } from 'react-icons/fi';
import apiClient from '../../api/client';
import './Support.css';

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id_order: '', description: '' });

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get('/support') as any;
      if (res?.status === 'success') {
        setTickets(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Backend API hiện chưa có endpoint /support riêng cho Shop 
    // Ta giả lập state hoặc chờ backend update
    setLoading(false);
    setTickets([
       { id_incident: 1, id_order: null, description: 'Lỗi phần mềm, không thể tính phí.', created_at: new Date().toISOString(), status: 'PENDING' }
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/support', formData);
      alert('Đã gửi yêu cầu hỗ trợ thành công!');
      setFormData({ id_order: '', description: '' });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Chúng tôi đã ghi nhận sự cố.');
    }
  };

  return (
    <div className="support-page">
      <div className="page-header">
        <h1 className="page-title">Trung Tâm Trợ Giúp & Báo Sự Cố</h1>
        <p style={{color: 'var(--slate-500)', marginTop: '8px'}}>Gửi yêu cầu bồi thường nếu hàng hóa có vấn đề hoặc thắc mắc về cước phí.</p>
      </div>

      <div className="support-grid">
        {/* Form Yêu Cầu */}
        <div className="support-section">
          <h3>Tạo Yêu Cầu Mới</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mã Đơn Hàng (Không bắt buộc)</label>
              <input 
                 type="text" 
                 className="form-control" 
                 placeholder="VD: 54 (Hoặc để trống nếu sự cố chung)" 
                 value={formData.id_order}
                 onChange={e => setFormData({...formData, id_order: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Chi tiết sự cố / Yêu cầu bồi thường *</label>
              <textarea 
                 required
                 className="form-control" 
                 placeholder="Mô tả chi tiết tình trạng hàng hóa rách/hỏng hoặc các vấn đề khác..."
                 value={formData.description}
                 onChange={e => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>
            <button type="submit" className="btn-primary" style={{width: '100%', padding: '12px'}}>
              Gửi Yêu Cầu Hỗ Trợ
            </button>
          </form>

          <div className="contact-card">
            <h4 style={{marginBottom: '16px', fontSize: '14px'}}>Liên Hệ Nhanh</h4>
            <div className="contact-item">
              <div className="contact-icon"><FiPhoneCall /></div>
              Hotline: 1900 6868
            </div>
            <div className="contact-item">
              <div className="contact-icon"><FiMail /></div>
              Email: cskh@banhangtot.vn
            </div>
          </div>
        </div>

        {/* Lịch sử */}
        <div className="support-section">
          <h3>Lịch Sử Yêu Cầu</h3>
          {loading ? (
             <div>Đang tải...</div>
          ) : tickets.length === 0 ? (
             <div style={{color: 'var(--slate-500)', textAlign: 'center', padding: '40px 0'}}>Chưa có yêu cầu nào.</div>
          ) : (
            <div className="ticket-list">
              {tickets.map(t => (
                <div key={t.id_incident} className="ticket-card">
                   <div className="ticket-header">
                      <span className="ticket-id">
                        <FiMessageSquare style={{marginRight: '6px', verticalAlign: 'middle'}}/>
                        Yêu cầu #{t.id_incident}
                      </span>
                      <span className={`status-badge ${t.status === 'RESOLVED' ? 'success' : 'warning'}`}>
                        {t.status === 'RESOLVED' ? 'ĐÃ XỬ LÝ' : 'ĐANG CHỜ'}
                      </span>
                   </div>
                   <div className="ticket-desc">{t.description}</div>
                   <div className="ticket-date" style={{marginTop: '12px'}}>{new Date(t.created_at).toLocaleString('vi-VN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support;
