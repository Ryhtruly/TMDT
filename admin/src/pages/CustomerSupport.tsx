import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiMessageSquare, FiShield, FiCheckCircle } from 'react-icons/fi';
import apiClient from '../api/client';

const CustomerSupport = () => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'feedbacks'>('incidents');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'incidents') {
        const res = await apiClient.get('/incidents');
        setIncidents(res?.data || []);
      } else {
        const res = await apiClient.get('/feedbacks');
        setFeedbacks(res?.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resolveIncident = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xác nhận đền bù cho sự cố này?')) return;
    try {
      await apiClient.put(`/incidents/${id}/resolve`);
      alert('Đã xử lý sự cố và chuyển tiền bồi thường thành công!');
      fetchData();
    } catch (error: any) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const updateFeedbackStatus = async (id: number, status: string) => {
    try {
      await apiClient.put(`/feedbacks/${id}`, { status });
      fetchData();
    } catch (error: any) {
      alert('Lỗi cập nhật: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'ĐÃ ĐỀN BÙ' || status === 'ĐÃ HOÀN TẤT') return '#10b981';
    if (status === 'ĐANG ĐIỀU TRA' || status === 'ĐANG XỬ LÝ') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div className="customer-support-page">
      <div className="page-header d-flex justify-between">
        <div>
          <h1 className="page-title">Trung Tâm Chăm Sóc Khách Hàng</h1>
          <p className="page-subtitle">Xử lý Sự cố, Đền bù tài sản và Phản hồi từ Shop.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <FiAlertTriangle className="tab-icon" /> Sự Cố & Đền Bù ({incidents.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'feedbacks' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedbacks')}
          >
            <FiMessageSquare className="tab-icon" /> Phản Hồi từ Shop ({feedbacks.length})
          </button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">Đang tải dữ liệu...</div>
          ) : (
            <table className="admin-table">
              {activeTab === 'incidents' ? (
                <>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Mã Đơn</th>
                      <th style={{ width: '18%' }}>Loại Sự Cố</th>
                      <th style={{ width: '30%' }}>Mô tả chi tiết</th>
                      <th style={{ width: '15%' }}>Tiền Đền Bù</th>
                      <th style={{ width: '15%' }}>Trạng thái</th>
                      <th style={{ width: '10%' }} className="text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map(i => (
                      <tr key={i.id_incident}>
                        <td>
                          <span className="badge-id" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                            {i.tracking_code || `ORD-${i.id_order}`}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{i.type}</span>
                        </td>
                        <td style={{ color: '#4b5563' }}>{i.description}</td>
                        <td style={{ fontWeight: 600, color: '#047857' }}>
                          {i.compensation ? parseFloat(i.compensation).toLocaleString() + ' ₫' : 'Chưa xác định'}
                        </td>
                        <td style={{ color: getStatusColor(i.status), fontWeight: 500 }}>
                          {i.status}
                        </td>
                        <td className="text-right">
                          {i.status !== 'ĐÃ ĐỀN BÙ' && (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => resolveIncident(i.id_incident)}
                            >
                              <FiShield style={{ marginBottom: '-2px', marginRight: '4px' }} />
                              Đền Bù
                            </button>
                          )}
                          {i.status === 'ĐÃ ĐỀN BÙ' && (
                            <FiCheckCircle style={{ color: '#10b981', fontSize: '1.4rem' }} />
                          )}
                        </td>
                      </tr>
                    ))}
                    {incidents.length === 0 && (
                      <tr><td colSpan={6} className="empty-state">Không có sự cố nào đang xử lý.</td></tr>
                    )}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>ID</th>
                      <th style={{ width: '15%' }}>User ID</th>
                      <th style={{ width: '25%' }}>Tiêu đề</th>
                      <th style={{ width: '30%' }}>Nội dung phản ánh</th>
                      <th style={{ width: '12%' }}>Trạng thái</th>
                      <th style={{ width: '10%' }} className="text-right">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map(f => (
                      <tr key={f.id_feedback}>
                        <td><span className="badge-id">TIX-{f.id_feedback}</span></td>
                        <td className="font-medium">USER-{f.id_user}</td>
                        <td style={{ fontWeight: 500 }}>{f.title || '(không có tiêu đề)'}</td>
                        <td style={{ color: '#4b5563' }}>{f.content}</td>
                        <td>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                            backgroundColor: f.status === 'ĐÃ HOÀN TẤT' ? '#d1fae5' : f.status === 'ĐANG XỬ LÝ' ? '#fef3c7' : '#f3f4f6',
                            color: f.status === 'ĐÃ HOÀN TẤT' ? '#047857' : f.status === 'ĐANG XỬ LÝ' ? '#b45309' : '#6b7280'
                          }}>
                            {f.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <select
                            className="form-control"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                            value={f.status}
                            onChange={e => updateFeedbackStatus(f.id_feedback, e.target.value)}
                          >
                            <option value="MỚI">MỚI</option>
                            <option value="ĐANG XỬ LÝ">ĐANG XỬ LÝ</option>
                            <option value="ĐÃ HOÀN TẤT">ĐÃ HOÀN TẤT</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {feedbacks.length === 0 && (
                      <tr><td colSpan={6} className="empty-state">Chưa có phản hồi nào từ Shop.</td></tr>
                    )}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
